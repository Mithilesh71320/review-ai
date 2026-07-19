import { assertPaidPlan, type SubscriptionAccess } from "@/lib/billing-access";
import { classifyReview } from "@/server/domain/review-classification";
import { classifyReviewSentimentFromText } from "@/lib/ai";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { googleService } from "./google.service";
import type { SettingsPayload } from "@/server/domain/settings-payload";

export class FetchReviewsService {
  async fetchLatestReviewsForBusiness(
    userId: string,
    access: SubscriptionAccess,
    options: { managedBusinessId?: string; placeId?: string; businessName?: string },
  ) {
    assertPaidPlan(access);
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = options.managedBusinessId
      ? await reviewMonitoringRepository.getManagedBusiness(workspace.id, options.managedBusinessId)
      : null;

    const fallbackBusinessName = options.businessName?.trim() || selectedManagedBusiness?.name;
    let placeId = options.placeId?.trim() || selectedManagedBusiness?.placeId || "";
    let placeName = fallbackBusinessName;
    let placeRating: number | undefined;
    let reviews: any[] = [];

    const accessToken = await googleService.getValidGoogleAccessToken(userId);

    if (selectedManagedBusiness?.locationName && accessToken) {
      const businessProfileResult = await googleService.fetchGoogleBusinessProfileReviews(
        accessToken,
        selectedManagedBusiness.locationName,
      );

      if (businessProfileResult.reviews.length > 0) {
        reviews = businessProfileResult.reviews;
        placeRating = businessProfileResult.rating;
        placeName = selectedManagedBusiness.name;
      }
    }

    if (!placeId) {
      if (!fallbackBusinessName) throw new Error("Either placeId or businessName is required");

      const resolvedPlace = await googleService.resolvePlaceIdFromBusinessName(fallbackBusinessName);
      placeId = resolvedPlace.placeId;
      placeName = resolvedPlace.name;
    }

    if (reviews.length === 0) {
      const placesResult = await googleService.fetchGooglePlacesReviews(placeId, accessToken ?? undefined);
      placeName = placesResult.name ?? placeName;
      placeRating = placesResult.rating;
      reviews = placesResult.reviews;
    }

    return this.ingestGoogleReviews(
      userId,
      access,
      options.managedBusinessId,
      placeId,
      placeName,
      reviews,
      placeRating,
    );
  }

  async ingestGoogleReviews(
    userId: string,
    access: SubscriptionAccess,
    managedBusinessId: string | undefined,
    placeId: string,
    businessName: string | undefined,
    reviews: any[],
    placeRating: number | undefined,
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = managedBusinessId
      ? await reviewMonitoringRepository.getManagedBusiness(workspace.id, managedBusinessId)
      : null;

    const safeName = businessName?.trim() || selectedManagedBusiness?.name || workspace.name;

    await this.updateSettings(userId, access, {
      business: {
        name: workspace.name,
        email: workspace.email ?? "",
        phone: workspace.phone ?? "",
        website: workspace.website ?? "",
        placeId: workspace.placeId ?? "",
      },
      notifications: {
        emailNotifications: workspace.settings?.emailNotifications ?? true,
        pushNotifications: workspace.settings?.pushNotifications ?? true,
        smsNotifications: workspace.settings?.smsNotifications ?? false,
        weeklyDigest: workspace.settings?.weeklyDigest ?? true,
      },
      ai: {
        provider: workspace.settings?.aiProvider ?? "gemini",
        sentimentModel: workspace.settings?.sentimentModel ?? "balanced",
        analysisLanguage: workspace.settings?.analysisLanguage ?? "en",
        autoRespond: workspace.settings?.autoRespond ?? true,
        businessContext: workspace.settings?.businessContext ?? "",
      },
      sources: workspace.sources.map((source) => ({
        key: source.source,
        connected: source.connected || source.source === "GOOGLE",
      })),
      businesses: [
        ...workspace.managedBusinesses.map((business) => ({
          id: business.id,
          name: business.name,
          placeId: business.placeId,
          accountName: business.accountName,
          locationName: business.locationName,
          mapsUri: business.mapsUri,
        })),
        ...(!workspace.managedBusinesses.some((business) => business.placeId === placeId)
          ? [
              {
                id: selectedManagedBusiness?.id,
                name: safeName,
                placeId,
                accountName: selectedManagedBusiness?.accountName,
                locationName: selectedManagedBusiness?.locationName,
                mapsUri: selectedManagedBusiness?.mapsUri,
              },
            ]
          : []),
      ],
    } as SettingsPayload);

    const managedBusinessRecord = selectedManagedBusiness
      ? await reviewMonitoringRepository.upsertManagedBusinesses(workspace.id, [
          {
            id: selectedManagedBusiness.id,
            name: safeName,
            placeId,
            accountName: selectedManagedBusiness.accountName,
            locationName: selectedManagedBusiness.locationName,
            mapsUri: selectedManagedBusiness.mapsUri,
          },
        ]).then((records) => records[0] ?? null)
      : await reviewMonitoringRepository.upsertManagedBusinesses(workspace.id, [
          { name: safeName, placeId, accountName: null, locationName: null, mapsUri: null },
        ]).then((records) => records[0] ?? null);

    let storedCount = 0;
    let reviewLimitReached = false;
    const reviewLimit = access.plan?.limits.maxStoredReviews ?? null;
    const existingReviewCount = await reviewMonitoringRepository.countReviews(workspace.id);
    let remainingReviewSlots =
      reviewLimit === null ? Number.MAX_SAFE_INTEGER : Math.max(reviewLimit - existingReviewCount, 0);
    const existingReviews = managedBusinessRecord
      ? await reviewMonitoringRepository.listReviews(workspace.id, managedBusinessRecord.id)
      : [];
    const existingExternalRefs = new Set(
      existingReviews
        .filter((record) => record.source === "GOOGLE" && record.externalRef)
        .map((record) => record.externalRef as string),
    );

    for (const review of reviews) {
      if (!review.text || typeof review.rating !== "number") continue;
      if (!managedBusinessRecord) continue;

      const externalRef = review.review_resource_name ?? googleService.makeExternalRef(placeId, review);
      const sentimentResult = await classifyReviewSentimentFromText({
        reviewText: review.text,
        rating: review.rating,
        businessName: managedBusinessRecord.name,
      });
      const sentiment = sentimentResult.sentiment;
      const classified = classifyReview(review.text, review.rating ?? 3);
      const createdAt = review.time ? new Date(review.time * 1000) : new Date();
      const existedBefore = existingExternalRefs.has(externalRef);

      if (!existedBefore && remainingReviewSlots <= 0) {
        reviewLimitReached = true;
        continue;
      }

      await reviewMonitoringRepository.upsertReview({
        businessId: workspace.id,
        managedBusinessId: managedBusinessRecord.id,
        author: review.author_name?.trim() || "Anonymous",
        text: review.text,
        rating: review.rating,
        sentiment,
        sentimentConfidence: sentimentResult.confidence ?? null,
        sentimentReason: sentimentResult.reason ?? null,
        reviewTags: classified.tags,
        source: "GOOGLE",
        externalRef,
        reviewResourceName: review.review_resource_name ?? null,
        reviewReply: review.review_reply ?? null,
        reviewRepliedAt: review.review_replied_at ? new Date(review.review_replied_at) : null,
        createdAt,
      });

      if (!existedBefore) {
        existingExternalRefs.add(externalRef);
        storedCount += 1;
        remainingReviewSlots -= 1;
        if (review.rating <= 2) {
          await reviewMonitoringRepository.createAlert(workspace.id, {
            managedBusinessId: managedBusinessRecord.id,
            type: "NEGATIVE_REVIEW",
            title: "New Negative Review Detected",
            description: `${review.author_name ?? "Anonymous"} left a ${review.rating}-star review on Google.`,
            severity: severityFromRating(review.rating),
            isRead: false,
          });
        }
      }
    }

    return {
      business: { id: managedBusinessRecord?.id ?? workspace.id, name: managedBusinessRecord?.name ?? safeName, placeId, rating: placeRating ?? null },
      storedCount,
      reviewLimitReached,
      reviewLimit,
    };
  }

  async updateSettings(userId: string, access: SubscriptionAccess, payload: SettingsPayload) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const normalizedBusinesses = payload.businesses
      .map((business) => ({ ...business, name: business.name.trim(), placeId: business.placeId.trim() }))
      .filter((business) => business.name && business.placeId);

    if (normalizedBusinesses.length > 0) {
      // assertBusinessLimit(access, normalizedBusinesses.length);
    }

    await reviewMonitoringRepository.updateSettings(workspace.id, {
      business: {
        name: payload.business.name.trim() || "My Business",
        email: payload.business.email.trim() || null,
        phone: payload.business.phone.trim() || null,
        website: payload.business.website.trim() || null,
        placeId: payload.business.placeId.trim() || null,
      },
      settings: {
        emailNotifications: payload.notifications.emailNotifications,
        pushNotifications: payload.notifications.pushNotifications,
        smsNotifications: payload.notifications.smsNotifications,
        weeklyDigest: payload.notifications.weeklyDigest,
        autoRespond: payload.ai.autoRespond,
        aiProvider: payload.ai.provider,
        sentimentModel: payload.ai.sentimentModel,
        analysisLanguage: payload.ai.analysisLanguage,
        businessContext: payload.ai.businessContext?.trim() || null,
      },
      sources: payload.sources.map((source) => ({ source: source.key, connected: source.connected })),
    });

    await reviewMonitoringRepository.upsertManagedBusinesses(workspace.id, normalizedBusinesses);
  }
}

function severityFromRating(rating: number) {
  if (rating <= 1) return "HIGH";
  if (rating <= 2) return "MEDIUM";
  return "LOW";
}

export const fetchReviewsService = new FetchReviewsService();