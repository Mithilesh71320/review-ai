/**
 * Review monitoring application service (facade).
 *
 * Domain helpers live under `src/server/domain/*`.
 * Persistence lives in `src/server/repositories/*`.
 * Route handlers should only call this service (or future focused modules).
 *
 * Method groups:
 * - Dashboard: getDashboard
 * - Reviews: getReviews, draftReviewReply, postReviewReply, fetchLatestReviewsForBusiness, ingestGoogleReviews
 * - Alerts: getAlerts, markAllAlertsRead, updateAlertRule
 * - Settings: getSettings, updateSettings
 * - Google: connectGoogleTokens, getValidGoogleAccessToken, listGoogleBusinesses, searchGooglePlaces
 * - Insights: getReviewInsights
 */
import crypto from "node:crypto";
import { AlertType, Sentiment } from "@/generated/prisma/client";
import {
  assertAdvancedAi,
  assertAiReplies,
  assertBusinessLimit,
  assertPaidPlan,
  type SubscriptionAccess,
} from "@/lib/billing-access";
import {
  classifyReviewSentimentFromText,
  generateReviewInsights,
  generateReviewReply,
} from "@/lib/ai";
import { formatStorefrontAddress, prettyEnum } from "@/server/domain/formatting";
import {
  GoogleApiError,
  googleStarRatingToNumber,
  toUnixSeconds,
  type GoogleAccountListResponse,
  type GoogleBusinessLocationsResponse,
  type GoogleLocationReviewsResponse,
  type GooglePlaceSearchResponse,
  type GoogleReview,
  type GoogleTokenRefreshResponse,
} from "@/server/domain/google/types";
import {
  classifyReview,
  severityFromRating,
} from "@/server/domain/review-classification";
import type { SettingsPayload } from "@/server/domain/settings-payload";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";

export class ReviewMonitoringService {
  async getDashboard(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = await this.resolveSelectedManagedBusiness(
      workspace.id,
      managedBusinessId,
    );
    const reviews = await reviewMonitoringRepository.listReviews(
      workspace.id,
      selectedManagedBusiness?.id,
    );
    const alerts = await reviewMonitoringRepository.listAlerts(
      workspace.id,
      selectedManagedBusiness?.id,
    );

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews === 0
        ? 0
        : reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const newToday = reviews.filter((review) => review.createdAt >= startOfDay).length;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const last7Days = reviews.filter((review) => review.createdAt >= sevenDaysAgo).length;
    const prev7Days = reviews.filter(
      (review) =>
        review.createdAt >= fourteenDaysAgo && review.createdAt < sevenDaysAgo,
    ).length;

    const weekDelta = last7Days - prev7Days;

    const activeAlerts = alerts.filter((alert) => !alert.isRead).length;
    const negativeToday = alerts.filter(
      (alert) =>
        alert.type === "NEGATIVE_REVIEW" &&
        alert.createdAt >= startOfDay &&
        !alert.isRead,
    ).length;

    const trendByMonth = this.buildSixMonthTrend(reviews, now);

    const positive = reviews.filter((r) => r.sentiment === "POSITIVE").length;
    const neutral = reviews.filter((r) => r.sentiment === "NEUTRAL").length;
    const negative = reviews.filter((r) => r.sentiment === "NEGATIVE").length;
    const totalSentiment = positive + neutral + negative;

    return {
      stats: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        newToday,
        activeAlerts,
        monthlyDelta: Number((averageRating - 4.5).toFixed(1)),
        weeklyDelta: weekDelta,
        sentimentTodayText: this.buildSentimentText(reviews, startOfDay),
        activeAlertsText:
          negativeToday > 0
            ? `${negativeToday} negative reviews detected today`
            : "No negative reviews detected today",
      },
      trend: trendByMonth,
      sentiment: [
        {
          name: "Positive",
          value: totalSentiment ? Math.round((positive / totalSentiment) * 100) : 0,
          color: "hsl(142, 76%, 36%)",
        },
        {
          name: "Neutral",
          value: totalSentiment ? Math.round((neutral / totalSentiment) * 100) : 0,
          color: "hsl(38, 92%, 50%)",
        },
        {
          name: "Negative",
          value: totalSentiment ? Math.round((negative / totalSentiment) * 100) : 0,
          color: "hsl(0, 84%, 60%)",
        },
      ],
      recentReviews: reviews.slice(0, 8).map((review) => ({
        id: review.id,
        text: review.text,
        rating: review.rating,
        sentiment: review.sentiment.toLowerCase(),
        time: review.createdAt.toISOString(),
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }

  async getReviews(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = await this.resolveSelectedManagedBusiness(
      workspace.id,
      managedBusinessId,
    );
    const reviews = await reviewMonitoringRepository.listReviews(
      workspace.id,
      selectedManagedBusiness?.id,
    );

    return {
      reviews: reviews.map((review) => ({
        ...classifyReview(review.text, review.rating),
        id: review.id,
        author: review.author,
        text: review.text,
        rating: review.rating,
        sentiment: review.sentiment.toLowerCase(),
        source: prettyEnum(review.source),
        createdAt: review.createdAt.toISOString(),
        canReply: Boolean(review.reviewResourceName),
        reply: review.reviewReply,
        repliedAt: review.reviewRepliedAt?.toISOString() ?? null,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }

  async getAlerts(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = await this.resolveSelectedManagedBusiness(
      workspace.id,
      managedBusinessId,
    );
    const [alerts, rules] = await Promise.all([
      reviewMonitoringRepository.listAlerts(workspace.id, selectedManagedBusiness?.id),
      reviewMonitoringRepository.listAlertRules(workspace.id),
    ]);

    return {
      unreadCount: alerts.filter((alert) => !alert.isRead).length,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        type: alert.type.toLowerCase(),
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        read: alert.isRead,
        createdAt: alert.createdAt.toISOString(),
      })),
      rules: rules.map((rule) => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }

  async markAllAlertsRead(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = await this.resolveSelectedManagedBusiness(
      workspace.id,
      managedBusinessId,
    );

    if (!selectedManagedBusiness) {
      await reviewMonitoringRepository.markAllAlertsRead(workspace.id);
      return;
    }

    await reviewMonitoringRepository.markAllAlertsReadForManagedBusiness(
      workspace.id,
      selectedManagedBusiness.id,
    );
  }

  async updateAlertRule(userId: string, type: AlertType, enabled: boolean) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    await reviewMonitoringRepository.updateAlertRule(workspace.id, type, enabled);
  }

  async getSettings(userId: string, access: SubscriptionAccess) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const storedReviews = await reviewMonitoringRepository.countReviews(workspace.id);

    return {
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
        source: prettyEnum(source.source),
        key: source.source,
        connected: source.connected,
      })),
      businesses: workspace.managedBusinesses.map((business) => ({
        id: business.id,
        name: business.name,
        placeId: business.placeId,
        accountName: business.accountName,
        locationName: business.locationName,
        mapsUri: business.mapsUri,
      })),
      subscription: {
        planKey: access.planKey,
        planName: access.plan?.name ?? null,
        hasPaidPlan: access.hasPaidPlan,
        limits: {
          maxBusinesses:
            access.plan?.limits.maxBusinesses ?? null,
          maxStoredReviews:
            access.plan?.limits.maxStoredReviews ?? null,
        },
        capabilities: access.capabilities,
        usage: {
          businesses: workspace.managedBusinesses.length,
          storedReviews,
        },
      },
    };
  }

  async updateSettings(
    userId: string,
    access: SubscriptionAccess,
    payload: SettingsPayload,
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const normalizedBusinesses = payload.businesses
      .map((business) => ({
        ...business,
        name: business.name.trim(),
        placeId: business.placeId.trim(),
      }))
      .filter((business) => business.name && business.placeId);

    if (normalizedBusinesses.length > 0) {
      assertBusinessLimit(access, normalizedBusinesses.length);
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
      sources: payload.sources.map((source) => ({
        source: source.key,
        connected: source.connected,
      })),
    });

    await reviewMonitoringRepository.upsertManagedBusinesses(
      workspace.id,
      normalizedBusinesses,
    );
  }

  async connectGoogleTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
      tokenType?: string;
      scope?: string;
    },
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const expiresAt =
      typeof tokens.expiresIn === "number"
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null;

    await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      accessTokenExpiresAt: expiresAt,
      tokenType: tokens.tokenType ?? null,
      scope: tokens.scope ?? null,
      connected: true,
    });
  }

  async getValidGoogleAccessToken(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const source = await reviewMonitoringRepository.getSourceConnection(
      workspace.id,
      "GOOGLE",
    );

    if (!source) {
      return null;
    }

    const tokenLooksUsable =
      source.accessToken &&
      source.accessTokenExpiresAt &&
      source.accessTokenExpiresAt.getTime() > Date.now() + 60_000;

    if (tokenLooksUsable) {
      return source.accessToken;
    }

    if (!source.refreshToken) {
      return null;
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth client config missing. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      );
    }

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: source.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    const refreshData = (await refreshRes.json()) as GoogleTokenRefreshResponse;

    if (!refreshRes.ok || !refreshData.access_token) {
      await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", {
        connected: false,
      });
      return null;
    }

    const expiresAt = new Date(Date.now() + (refreshData.expires_in ?? 3600) * 1000);
    await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", {
      accessToken: refreshData.access_token,
      accessTokenExpiresAt: expiresAt,
      tokenType: refreshData.token_type ?? "Bearer",
      scope: refreshData.scope ?? source.scope,
      connected: true,
    });

    return refreshData.access_token;
  }

  async listGoogleBusinesses(userId: string) {
    const accessToken = await this.getValidGoogleAccessToken(userId);

    if (!accessToken) {
      return {
        connected: false,
        businesses: [] as Array<{
          accountName: string;
          locationName: string;
          title: string;
          placeId: string | null;
          address: string | null;
          mapsUri: string | null;
        }>,
      };
    }

    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!accountsRes.ok) {
      throw new Error("Failed to fetch Google Business accounts.");
    }

    const accountsData = (await accountsRes.json()) as GoogleAccountListResponse;
    const accounts = accountsData.accounts ?? [];

    const locationResults = await Promise.all(
      accounts.map(async (account) => {
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,metadata`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        );

        if (!locationsRes.ok) {
          return [];
        }

        const locationsData =
          (await locationsRes.json()) as GoogleBusinessLocationsResponse;

        return (locationsData.locations ?? []).map((location) => ({
          accountName: account.accountName ?? account.name,
          locationName: location.name,
          title: location.title ?? "Untitled business",
          placeId: location.metadata?.placeId ?? null,
          mapsUri: location.metadata?.mapsUri ?? null,
          address: formatStorefrontAddress(location.storefrontAddress),
        }));
      }),
    );

    return {
      connected: true,
      businesses: locationResults.flat(),
    };
  }

  async searchGooglePlaces(query: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured.");
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { places: [] as Array<{
        placeId: string;
        name: string;
        address: string | null;
        rating: number | null;
        userRatingCount: number | null;
      }> };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: trimmedQuery,
        pageSize: 8,
      }),
      cache: "no-store",
    });

    const data = (await response.json()) as GooglePlaceSearchResponse;

    if (!response.ok) {
      const googleMessage = data.error?.message?.trim();
      const fallbackMessage = "Failed to search Google Places.";
      const message =
        response.status === 403 && googleMessage
          ? `Google Places access denied: ${googleMessage}`
          : googleMessage || fallbackMessage;

      throw new GoogleApiError(message, response.status);
    }

    return {
      places: (data.places ?? [])
        .filter((place): place is NonNullable<typeof place> & { id: string } => Boolean(place.id))
        .map((place) => ({
          placeId: place.id,
          name: place.displayName?.text ?? "Unknown place",
          address: place.formattedAddress ?? null,
          rating: place.rating ?? null,
          userRatingCount: place.userRatingCount ?? null,
        })),
    };
  }

  async resolvePlaceIdFromBusinessName(query: string) {
    const result = await this.searchGooglePlaces(query);
    const bestMatch = result.places[0];

    if (!bestMatch) {
      throw new Error("No Google Place match found for that business name.");
    }

    return bestMatch;
  }

  async getReviewInsights(
    userId: string,
    access: SubscriptionAccess,
    managedBusinessId?: string,
  ) {
    assertAdvancedAi(access);
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = await this.resolveSelectedManagedBusiness(
      workspace.id,
      managedBusinessId,
    );
    const reviews = await reviewMonitoringRepository.listReviews(
      workspace.id,
      selectedManagedBusiness?.id,
    );

    if (reviews.length === 0) {
      throw new Error("No reviews available for AI analysis.");
    }

    return generateReviewInsights({
      businessName: selectedManagedBusiness?.name ?? workspace.name,
      businessContext: workspace.settings?.businessContext ?? "",
      reviews: reviews.slice(0, 20).map((review) => {
        const classified = classifyReview(review.text, review.rating);
        return {
          author: review.author,
          rating: review.rating,
          text: review.text,
          tags: classified.tags,
          createdAt: review.createdAt.toISOString(),
        };
      }),
    });
  }

  async draftReviewReply(
    userId: string,
    access: SubscriptionAccess,
    reviewId: string,
  ) {
    assertAiReplies(access);
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const review = await reviewMonitoringRepository.getReviewById(reviewId, workspace.id);

    if (!review) {
      throw new Error("Review not found.");
    }

    return generateReviewReply({
      businessName: review.managedBusiness?.name ?? workspace.name,
      businessContext: workspace.settings?.businessContext ?? "",
      review: {
        author: review.author,
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt.toISOString(),
      },
    });
  }

  async postReviewReply(
    userId: string,
    access: SubscriptionAccess,
    reviewId: string,
    replyText: string,
  ) {
    assertAiReplies(access);
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const review = await reviewMonitoringRepository.getReviewById(reviewId, workspace.id);

    if (!review) {
      throw new Error("Review not found.");
    }

    if (!review.reviewResourceName) {
      throw new Error(
        "This review was not fetched from Google Business Profile, so posting a reply is not available.",
      );
    }

    const accessToken = await this.getValidGoogleAccessToken(userId);
    if (!accessToken) {
      throw new Error("Google Business account is not connected.");
    }

    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${review.reviewResourceName}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: replyText.trim() }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string; status?: string } }
        | null;
      const googleMessage = payload?.error?.message?.trim();

      if (response.status === 403 || response.status === 401) {
        throw new Error(
          "You are not the owner or authorized manager of this Google Business Profile. Only the owner/manager can post replies.",
        );
      }

      throw new Error(googleMessage || "Failed to post Google review reply.");
    }

    const repliedAt = new Date();
    await reviewMonitoringRepository.updateReviewReply(review.id, {
      reviewReply: replyText.trim(),
      reviewRepliedAt: repliedAt,
    });

    return {
      ok: true,
      repliedAt: repliedAt.toISOString(),
    };
  }

  async fetchLatestReviewsForBusiness(
    userId: string,
    access: SubscriptionAccess,
    options: {
      managedBusinessId?: string;
      placeId?: string;
      businessName?: string;
    },
  ) {
    assertPaidPlan(access);
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = options.managedBusinessId
      ? await reviewMonitoringRepository.getManagedBusiness(
          workspace.id,
          options.managedBusinessId,
        )
      : null;

    const fallbackBusinessName = options.businessName?.trim() || selectedManagedBusiness?.name;
    let placeId = options.placeId?.trim() || selectedManagedBusiness?.placeId || "";
    let placeName = fallbackBusinessName;
    let placeRating: number | undefined;
    let reviews: GoogleReview[] = [];

    const accessToken = await this.getValidGoogleAccessToken(userId);

    if (selectedManagedBusiness?.locationName && accessToken) {
      const businessProfileResult = await this.fetchGoogleBusinessProfileReviews(
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
      if (!fallbackBusinessName) {
        throw new Error("Either placeId or businessName is required");
      }

      const resolvedPlace = await this.resolvePlaceIdFromBusinessName(fallbackBusinessName);
      placeId = resolvedPlace.placeId;
      placeName = resolvedPlace.name;
    }

    if (reviews.length === 0) {
      const placesResult = await this.fetchGooglePlacesReviews(placeId, accessToken ?? undefined);
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
    reviews: GoogleReview[],
    placeRating: number | undefined,
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness = managedBusinessId
      ? await reviewMonitoringRepository.getManagedBusiness(workspace.id, managedBusinessId)
      : null;

    const safeName =
      businessName?.trim() || selectedManagedBusiness?.name || workspace.name;

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
    });

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
          {
            name: safeName,
            placeId,
            accountName: null,
            locationName: null,
            mapsUri: null,
          },
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
      if (!review.text || typeof review.rating !== "number") {
        continue;
      }

      if (!managedBusinessRecord) {
        continue;
      }
      const externalRef = review.review_resource_name ?? this.makeExternalRef(placeId, review);
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
        reviewRepliedAt: review.review_replied_at
          ? new Date(review.review_replied_at)
          : null,
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
      business: {
        id: managedBusinessRecord?.id ?? workspace.id,
        name: managedBusinessRecord?.name ?? safeName,
        placeId,
        rating: placeRating ?? null,
      },
      storedCount,
      reviewLimitReached,
      reviewLimit,
    };
  }

  private buildSixMonthTrend(
    reviews: Array<{ rating: number; createdAt: Date }>,
    fromDate: Date,
  ) {
    const months: Array<{ key: string; label: string }> = [];

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(fromDate.getFullYear(), fromDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleString("en-US", { month: "short" });
      months.push({ key, label });
    }

    return months.map(({ key, label }) => {
      const monthReviews = reviews.filter((review) => {
        const reviewKey = `${review.createdAt.getFullYear()}-${review.createdAt.getMonth()}`;
        return reviewKey === key;
      });

      const rating =
        monthReviews.length === 0
          ? 0
          : monthReviews.reduce((sum, review) => sum + review.rating, 0) /
            monthReviews.length;

      return { month: label, rating: Number(rating.toFixed(1)) };
    });
  }

  private buildSentimentText(
    reviews: Array<{ sentiment: Sentiment; createdAt: Date }>,
    fromDate: Date,
  ) {
    const dayReviews = reviews.filter((review) => review.createdAt >= fromDate);
    const positive = dayReviews.filter((r) => r.sentiment === "POSITIVE").length;
    const neutral = dayReviews.filter((r) => r.sentiment === "NEUTRAL").length;
    const negative = dayReviews.filter((r) => r.sentiment === "NEGATIVE").length;
    return `${positive} positive, ${negative} negative, ${neutral} neutral`;
  }

  private async resolveSelectedManagedBusiness(
    workspaceId: string,
    managedBusinessId?: string,
  ) {
    if (managedBusinessId) {
      const selected = await reviewMonitoringRepository.getManagedBusiness(
        workspaceId,
        managedBusinessId,
      );
      if (selected) {
        return selected;
      }
    }

    const businesses = await reviewMonitoringRepository.listManagedBusinesses(workspaceId);
    return businesses[0] ?? null;
  }

  private async fetchGooglePlacesReviews(placeId: string, accessToken?: string) {
    let placeName: string | undefined;
    let placeRating: number | undefined;
    let reviews: GoogleReview[] = [];

    if (accessToken) {
      const v1Res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Goog-FieldMask": "displayName,rating,reviews",
        },
        cache: "no-store",
      });

      if (v1Res.ok) {
        const v1Data = (await v1Res.json()) as {
          displayName?: { text?: string };
          rating?: number;
          reviews?: Array<{
            authorAttribution?: { displayName?: string };
            text?: { text?: string };
            rating?: number;
            publishTime?: string;
          }>;
        };

        placeName = v1Data.displayName?.text;
        placeRating = v1Data.rating;
        reviews =
          v1Data.reviews?.map((review) => ({
            author_name: review.authorAttribution?.displayName,
            text: review.text?.text,
            rating: review.rating,
            time: toUnixSeconds(review.publishTime),
          })) ?? [];
      }
    }

    if (reviews.length > 0) {
      return { name: placeName, rating: placeRating, reviews };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Google auth missing for this user and GOOGLE_PLACES_API_KEY is not configured.",
      );
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "name,rating,reviews");
    url.searchParams.set("reviews_sort", "newest");
    url.searchParams.set("key", apiKey);

    const googleRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!googleRes.ok) {
      throw new Error("Failed to fetch Google place details");
    }

    const data = (await googleRes.json()) as {
      status: string;
      result?: {
        name?: string;
        rating?: number;
        reviews?: GoogleReview[];
      };
      error_message?: string;
    };

    if (data.status !== "OK" || !data.result) {
      throw new Error(data.error_message || "Google Places API request failed");
    }

    return {
      name: data.result.name,
      rating: data.result.rating,
      reviews: data.result.reviews ?? [],
    };
  }

  private async fetchGoogleBusinessProfileReviews(
    accessToken: string,
    locationName: string,
  ) {
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=5&orderBy=updateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { reviews: [] as GoogleReview[], rating: undefined as number | undefined };
    }

    const payload = (await response.json()) as GoogleLocationReviewsResponse;

    return {
      rating: payload.averageRating,
      reviews:
        payload.reviews?.map((review) => ({
          author_name: review.reviewer?.displayName,
          text: review.comment,
          rating: googleStarRatingToNumber(review.starRating),
          time: toUnixSeconds(review.createTime),
          review_resource_name: review.name,
          review_reply: review.reviewReply?.comment,
          review_replied_at: review.reviewReply?.updateTime,
        })) ?? [],
    };
  }

  private makeExternalRef(placeId: string, review: GoogleReview) {
    const base = `${placeId}|${review.author_name ?? "anonymous"}|${review.time ?? "0"}|${review.text ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
  }
}

export const reviewMonitoringService = new ReviewMonitoringService();
