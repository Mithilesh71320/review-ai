import crypto from "node:crypto";
import {
  AlertType,
  ReviewSource,
  Sentiment,
  type AlertSeverity,
} from "@/generated/prisma/client";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";

type GoogleReview = {
  author_name?: string;
  text?: string;
  rating?: number;
  time?: number;
};

export class ReviewMonitoringService {
  async getDashboard(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const reviews = await reviewMonitoringRepository.listReviews(workspace.id);
    const alerts = await reviewMonitoringRepository.listAlerts(workspace.id);

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
    };
  }

  async getReviews(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const reviews = await reviewMonitoringRepository.listReviews(workspace.id);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        author: review.author,
        text: review.text,
        rating: review.rating,
        sentiment: review.sentiment.toLowerCase(),
        source: this.prettyEnum(review.source),
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }

  async getAlerts(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const [alerts, rules] = await Promise.all([
      reviewMonitoringRepository.listAlerts(workspace.id),
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
    };
  }

  async markAllAlertsRead(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    await reviewMonitoringRepository.markAllAlertsRead(workspace.id);
  }

  async updateAlertRule(userId: string, type: AlertType, enabled: boolean) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    await reviewMonitoringRepository.updateAlertRule(workspace.id, type, enabled);
  }

  async getSettings(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);

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
        sentimentModel: workspace.settings?.sentimentModel ?? "balanced",
        analysisLanguage: workspace.settings?.analysisLanguage ?? "en",
        autoRespond: workspace.settings?.autoRespond ?? true,
      },
      sources: workspace.sources.map((source) => ({
        source: this.prettyEnum(source.source),
        key: source.source,
        connected: source.connected,
      })),
    };
  }

  async updateSettings(
    userId: string,
    payload: {
      business: {
        name: string;
        email: string;
        phone: string;
        website: string;
        placeId: string;
      };
      notifications: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        smsNotifications: boolean;
        weeklyDigest: boolean;
      };
      ai: {
        sentimentModel: string;
        analysisLanguage: string;
        autoRespond: boolean;
      };
      sources: Array<{ key: ReviewSource; connected: boolean }>;
    },
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);

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
        sentimentModel: payload.ai.sentimentModel,
        analysisLanguage: payload.ai.analysisLanguage,
      },
      sources: payload.sources.map((source) => ({
        source: source.key,
        connected: source.connected,
      })),
    });
  }

  async ingestGoogleReviews(
    userId: string,
    placeId: string,
    businessName: string | undefined,
    reviews: GoogleReview[],
    placeRating: number | undefined,
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);

    const safeName = businessName?.trim() || workspace.name;

    await this.updateSettings(userId, {
      business: {
        name: safeName,
        email: workspace.email ?? "",
        phone: workspace.phone ?? "",
        website: workspace.website ?? "",
        placeId,
      },
      notifications: {
        emailNotifications: workspace.settings?.emailNotifications ?? true,
        pushNotifications: workspace.settings?.pushNotifications ?? true,
        smsNotifications: workspace.settings?.smsNotifications ?? false,
        weeklyDigest: workspace.settings?.weeklyDigest ?? true,
      },
      ai: {
        sentimentModel: workspace.settings?.sentimentModel ?? "balanced",
        analysisLanguage: workspace.settings?.analysisLanguage ?? "en",
        autoRespond: workspace.settings?.autoRespond ?? true,
      },
      sources: workspace.sources.map((source) => ({
        key: source.source,
        connected: source.connected || source.source === "GOOGLE",
      })),
    });

    let storedCount = 0;

    for (const review of reviews) {
      if (!review.text || typeof review.rating !== "number") {
        continue;
      }

      const externalRef = this.makeExternalRef(review);
      const sentiment = this.sentimentFromRating(review.rating);

      try {
        await reviewMonitoringRepository.createReview({
          business: { connect: { id: workspace.id } },
          author: review.author_name?.trim() || "Anonymous",
          text: review.text,
          rating: review.rating,
          sentiment,
          source: "GOOGLE",
          externalRef,
          createdAt: review.time
            ? new Date(review.time * 1000)
            : new Date(),
        });

        storedCount += 1;

        if (review.rating <= 2) {
          await reviewMonitoringRepository.createAlert(workspace.id, {
            type: "NEGATIVE_REVIEW",
            title: "New Negative Review Detected",
            description: `${review.author_name ?? "Anonymous"} left a ${review.rating}-star review on Google.`,
            severity: this.severityFromRating(review.rating),
            isRead: false,
          });
        }
      } catch {
        // ignore duplicate review upserts based on unique externalRef
      }
    }

    return {
      business: {
        id: workspace.id,
        name: safeName,
        placeId,
        rating: placeRating ?? null,
      },
      storedCount,
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

  private sentimentFromRating(rating: number): Sentiment {
    if (rating <= 2) {
      return "NEGATIVE";
    }
    if (rating === 3) {
      return "NEUTRAL";
    }
    return "POSITIVE";
  }

  private severityFromRating(rating: number): AlertSeverity {
    if (rating <= 1) {
      return "HIGH";
    }
    if (rating <= 2) {
      return "MEDIUM";
    }
    return "LOW";
  }

  private makeExternalRef(review: GoogleReview) {
    const base = `${review.author_name ?? "anonymous"}|${review.time ?? "0"}|${review.text ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
  }

  private prettyEnum(value: string) {
    return value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}

export const reviewMonitoringService = new ReviewMonitoringService();
