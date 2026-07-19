import { AlertType } from "@prisma/client";
import {
  assertBusinessLimit,
  type SubscriptionAccess,
} from "@/lib/billing-access";
import { prettyEnum } from "@/server/domain/formatting";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { classifyReview } from "@/server/domain/review-classification";
import type { SettingsPayload } from "@/server/domain/settings-payload";
import { googleService } from "./google.service";
import { insightsService } from "./insights.service";
import { reviewsReplyService } from "./reviews-reply.service";
import { fetchReviewsService } from "./fetch-reviews.service";

const DEFAULT_REVIEWS_PAGE_LIMIT = 25;
const MAX_REVIEWS_PAGE_LIMIT = 100;
const DEFAULT_ALERTS_PAGE_LIMIT = 25;
const MAX_ALERTS_PAGE_LIMIT = 100;
const TREND_DAY_OPTIONS = [7, 30, 90] as const;

function normalizePageLimit(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function normalizeTrendDays(value: number | undefined) {
  return TREND_DAY_OPTIONS.includes(value as (typeof TREND_DAY_OPTIONS)[number])
    ? value!
    : 30;
}

function buildRatingTrend(
  reviews: Array<{ rating: number; createdAt: Date }>,
  fromDate: Date,
  days: number,
) {
  const bucketCount = 6;
  const bucketSize = Math.ceil(days / bucketCount);
  const start = new Date(fromDate);
  start.setDate(fromDate.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * bucketSize);
    const bucketEnd = new Date(start);
    bucketEnd.setDate(start.getDate() + (index + 1) * bucketSize);

    return {
      start: bucketStart,
      end: bucketEnd,
      label: bucketStart.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
  });

  return buckets.map((bucket, index) => {
    const bucketReviews = reviews.filter((review) => {
      if (index === buckets.length - 1) {
        return review.createdAt >= bucket.start && review.createdAt <= fromDate;
      }
      return review.createdAt >= bucket.start && review.createdAt < bucket.end;
    });

    const rating =
      bucketReviews.length === 0
        ? 0
        : bucketReviews.reduce((sum, review) => sum + review.rating, 0) /
          bucketReviews.length;

    return { month: bucket.label, rating: Number(rating.toFixed(1)) };
  });
}

function getNextCursor<T extends { id: string }>(items: T[], requestedTake: number) {
  if (items.length <= requestedTake) {
    return { pageItems: items, nextCursor: null };
  }

  const pageItems = items.slice(0, requestedTake);
  return {
    pageItems,
    nextCursor: pageItems.at(-1)?.id ?? null,
  };
}

export class ReviewMonitoringService {
  async getDashboard(
    userId: string,
    managedBusinessId?: string,
    trendDaysInput?: number,
  ) {
    // ensureWorkspace is a single fast SELECT for existing users
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      workspace.managedBusinesses.find((business) => business.id === managedBusinessId) ??
      workspace.managedBusinesses[0];

    const trendDays = normalizeTrendDays(trendDaysInput);

    const metrics = await reviewMonitoringRepository.getDashboardMetrics(
      workspace.id,
      selectedManagedBusiness?.id,
      trendDays,
    );

    const {
      totalReviews,
      averageRating,
      newToday,
      weekDelta,
      sentimentCount,
      sentimentToday,
      activeAlerts,
      negativeToday,
      recentReviews,
      trendRows,
      now,
    } = metrics;

    const totalSentiment =
      sentimentCount.POSITIVE + sentimentCount.NEUTRAL + sentimentCount.NEGATIVE;

    return {
      stats: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        newToday,
        activeAlerts,
        monthlyDelta: Number((averageRating - 4.5).toFixed(1)),
        weeklyDelta: weekDelta,
        sentimentTodayText: `${sentimentToday.POSITIVE} positive, ${sentimentToday.NEGATIVE} negative, ${sentimentToday.NEUTRAL} neutral`,
        activeAlertsText:
          negativeToday > 0
            ? `${negativeToday} negative reviews detected today`
            : "No negative reviews detected today",
      },
      trend: buildRatingTrend(trendRows, now, trendDays),
      trendDays,
      sentiment: [
        {
          name: "Positive",
          value: totalSentiment
            ? Math.round((sentimentCount.POSITIVE / totalSentiment) * 100)
            : 0,
          color: "hsl(142, 76%, 36%)",
        },
        {
          name: "Neutral",
          value: totalSentiment
            ? Math.round((sentimentCount.NEUTRAL / totalSentiment) * 100)
            : 0,
          color: "hsl(38, 92%, 50%)",
        },
        {
          name: "Negative",
          value: totalSentiment
            ? Math.round((sentimentCount.NEGATIVE / totalSentiment) * 100)
            : 0,
          color: "hsl(0, 84%, 60%)",
        },
      ],
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        text: r.text,
        rating: r.rating,
        sentiment: r.sentiment.toLowerCase(),
        time: r.createdAt.toISOString(),
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }

  async getReviews(
    userId: string,
    managedBusinessId?: string,
    options?: { cursor?: string; limit?: number },
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );

    const pageLimit = normalizePageLimit(
      options?.limit,
      DEFAULT_REVIEWS_PAGE_LIMIT,
      MAX_REVIEWS_PAGE_LIMIT,
    );
    const reviews = await reviewMonitoringRepository.listReviewsPage(
      workspace.id,
      selectedManagedBusiness?.id,
      { take: pageLimit + 1, cursor: options?.cursor },
    );
    const { pageItems, nextCursor } = getNextCursor(reviews, pageLimit);

    return {
      reviews: pageItems.map((r) => ({
        ...classifyReview(r.text, r.rating),
        id: r.id,
        author: r.author,
        text: r.text,
        rating: r.rating,
        sentiment: r.sentiment.toLowerCase(),
        source: prettyEnum(r.source),
        createdAt: r.createdAt.toISOString(),
        canReply: Boolean(r.reviewResourceName),
        reply: r.reviewReply,
        repliedAt: r.reviewRepliedAt?.toISOString() ?? null,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
      nextCursor,
      hasMore: Boolean(nextCursor),
    };
  }

  async getAlerts(
    userId: string,
    managedBusinessId?: string,
    options?: { cursor?: string; limit?: number },
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );

    const managedId = selectedManagedBusiness?.id;
    const pageLimit = normalizePageLimit(
      options?.limit,
      DEFAULT_ALERTS_PAGE_LIMIT,
      MAX_ALERTS_PAGE_LIMIT,
    );
    const [alerts, rules, unreadCount] = await Promise.all([
      reviewMonitoringRepository.listAlertsPage(workspace.id, managedId, {
        take: pageLimit + 1,
        cursor: options?.cursor,
      }),
      reviewMonitoringRepository.listAlertRules(workspace.id),
      reviewMonitoringRepository.countUnreadAlerts(workspace.id, managedId),
    ]);
    const { pageItems, nextCursor } = getNextCursor(alerts, pageLimit);

    return {
      unreadCount,
      alerts: pageItems.map((a) => ({
        id: a.id,
        type: a.type.toLowerCase(),
        title: a.title,
        description: a.description,
        severity: a.severity.toLowerCase(),
        read: a.isRead,
        createdAt: a.createdAt.toISOString(),
      })),
      rules: rules.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        description: r.description,
        enabled: r.enabled,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
      nextCursor,
      hasMore: Boolean(nextCursor),
    };
  }

  async markAllAlertsRead(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
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
    const businessId = await reviewMonitoringRepository.getOrCreateBusinessId(userId);
    await reviewMonitoringRepository.updateAlertRule(businessId, type, enabled);
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
      sources: workspace.sources.map((s) => ({
        source: prettyEnum(s.source),
        key: s.source,
        connected: s.connected,
      })),
      businesses: workspace.managedBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        placeId: b.placeId,
        accountName: b.accountName,
        locationName: b.locationName,
        mapsUri: b.mapsUri,
      })),
      subscription: {
        planKey: access.planKey,
        planName: access.plan?.name ?? null,
        hasPaidPlan: access.hasPaidPlan,
        limits: {
          maxBusinesses: access.plan?.limits.maxBusinesses ?? null,
          maxStoredReviews: access.plan?.limits.maxStoredReviews ?? null,
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
      .map((b) => ({ ...b, name: b.name.trim(), placeId: b.placeId.trim() }))
      .filter((b) => b.name && b.placeId);

    if (normalizedBusinesses.length > 0) assertBusinessLimit(access, normalizedBusinesses.length);

    await Promise.all([
      reviewMonitoringRepository.updateSettings(workspace.id, {
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
        sources: payload.sources.map((s) => ({
          source: s.key,
          connected: s.connected,
        })),
      }),
      reviewMonitoringRepository.upsertManagedBusinesses(
        workspace.id,
        normalizedBusinesses,
      ),
    ]);

    reviewMonitoringRepository.invalidateWorkspaceCache(userId);
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
    return googleService.getValidGoogleAccessToken(userId);
  }

  async listGoogleBusinesses(userId: string) {
    return googleService.listGoogleBusinesses(userId);
  }

  async searchGooglePlaces(query: string) {
    return googleService.searchGooglePlaces(query);
  }

  async getReviewInsights(
    userId: string,
    access: SubscriptionAccess,
    managedBusinessId?: string,
  ) {
    return insightsService.getReviewInsights(userId, access, managedBusinessId);
  }

  async draftReviewReply(
    userId: string,
    access: SubscriptionAccess,
    reviewId: string,
  ) {
    return reviewsReplyService.draftReviewReply(userId, access, reviewId);
  }

  async postReviewReply(
    userId: string,
    access: SubscriptionAccess,
    reviewId: string,
    replyText: string,
  ) {
    return reviewsReplyService.postReviewReply(userId, access, reviewId, replyText);
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
    return fetchReviewsService.fetchLatestReviewsForBusiness(userId, access, options);
  }
}

export const reviewMonitoringService = new ReviewMonitoringService();
