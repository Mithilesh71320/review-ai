import {
  AlertType,
  Prisma,
  ReviewSource,
  type AlertSeverity,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const defaultRules: Record<
  AlertType,
  { name: string; description: string; enabled: boolean }
> = {
  NEGATIVE_REVIEW: {
    name: "Negative Review Alert",
    description: "Get notified when a 1 or 2-star review is posted",
    enabled: true,
  },
  RATING_DROP: {
    name: "Rating Drop Alert",
    description: "Alert when average rating drops by 0.2 or more",
    enabled: true,
  },
  TREND: {
    name: "Recurring Complaint",
    description: "Detect when same issue is mentioned 3+ times",
    enabled: true,
  },
  POSITIVE_SPIKE: {
    name: "Positive Spike",
    description: "Notify when 5+ positive reviews arrive in 24 hours",
    enabled: false,
  },
};

const allSources: ReviewSource[] = [
  "GOOGLE",
  "YELP",
  "FACEBOOK",
  "TRIPADVISOR",
];

export class ReviewMonitoringRepository {
  async ensureWorkspace(userId: string) {
    const business = await prisma.business.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        name: "My Business",
      },
    });

    await prisma.businessSettings.upsert({
      where: { businessId: business.id },
      update: {},
      create: { businessId: business.id },
    });

    await prisma.sourceConnection.createMany({
      data: allSources.map((source) => ({
        businessId: business.id,
        source,
        connected: source === "GOOGLE",
      })),
      skipDuplicates: true,
    });

    await prisma.alertRule.createMany({
      data: (Object.keys(defaultRules) as AlertType[]).map((type) => ({
        businessId: business.id,
        type,
        name: defaultRules[type].name,
        description: defaultRules[type].description,
        enabled: defaultRules[type].enabled,
      })),
      skipDuplicates: true,
    });

    return prisma.business.findUniqueOrThrow({
      where: { id: business.id },
      include: {
        settings: true,
        sources: true,
        rules: true,
      },
    });
  }

  async listReviews(businessId: string) {
    return prisma.review.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAlerts(businessId: string) {
    return prisma.alert.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAlertRules(businessId: string) {
    return prisma.alertRule.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listSources(businessId: string) {
    return prisma.sourceConnection.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
    });
  }

  async getSourceConnection(businessId: string, source: ReviewSource) {
    return prisma.sourceConnection.findUnique({
      where: {
        businessId_source: {
          businessId,
          source,
        },
      },
    });
  }

  async updateSourceTokens(
    businessId: string,
    source: ReviewSource,
    tokens: {
      accessToken?: string | null;
      refreshToken?: string | null;
      accessTokenExpiresAt?: Date | null;
      tokenType?: string | null;
      scope?: string | null;
      connected?: boolean;
    },
  ) {
    return prisma.sourceConnection.update({
      where: {
        businessId_source: {
          businessId,
          source,
        },
      },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        connected: tokens.connected,
      },
    });
  }

  async markAllAlertsRead(businessId: string) {
    await prisma.alert.updateMany({
      where: { businessId, isRead: false },
      data: { isRead: true },
    });
  }

  async updateAlertRule(businessId: string, type: AlertType, enabled: boolean) {
    return prisma.alertRule.update({
      where: {
        businessId_type: {
          businessId,
          type,
        },
      },
      data: { enabled },
    });
  }

  async updateSettings(
    businessId: string,
    data: {
      business: {
        name: string;
        email: string | null;
        phone: string | null;
        website: string | null;
        placeId: string | null;
      };
      settings: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        smsNotifications: boolean;
        weeklyDigest: boolean;
        autoRespond: boolean;
        sentimentModel: string;
        analysisLanguage: string;
      };
      sources: Array<{ source: ReviewSource; connected: boolean }>;
    },
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: data.business,
      });

      await tx.businessSettings.update({
        where: { businessId },
        data: data.settings,
      });

      for (const source of data.sources) {
        await tx.sourceConnection.update({
          where: {
            businessId_source: {
              businessId,
              source: source.source,
            },
          },
          data: { connected: source.connected },
        });
      }
    });
  }

  async createAlert(
    businessId: string,
    input: {
      type: AlertType;
      title: string;
      description: string;
      severity: AlertSeverity;
      isRead?: boolean;
    },
  ) {
    return prisma.alert.create({
      data: {
        businessId,
        type: input.type,
        title: input.title,
        description: input.description,
        severity: input.severity,
        isRead: input.isRead ?? false,
      },
    });
  }

  async createReview(input: Prisma.ReviewCreateInput) {
    return prisma.review.create({
      data: input,
    });
  }
}

export const reviewMonitoringRepository = new ReviewMonitoringRepository();
