import {
  AlertType,
  Prisma,
  ReviewSource,
  type AlertSeverity,
  type Sentiment,
} from "@prisma/client";
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

const workspaceInclude = {
  settings: true,
  sources: true,
  rules: true,
  managedBusinesses: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.BusinessInclude;

type Workspace = Prisma.BusinessGetPayload<{ include: typeof workspaceInclude }>;

/** Short in-process cache to skip repeated bootstrap on warm Neon. */
const workspaceCache = new Map<string, { expiresAt: number; value: Workspace }>();
const WORKSPACE_CACHE_TTL_MS = 30_000;

function reviewScope(businessId: string, managedBusinessId?: string) {
  return {
    businessId,
    ...(managedBusinessId ? { managedBusinessId } : {}),
  };
}

type PageOptions = {
  take: number;
  cursor?: string;
};

export class ReviewMonitoringRepository {
  /**
   * Fast path: single SELECT with relations when workspace already exists.
   * Bootstrap only runs for brand-new users (or incomplete workspaces).
   */
  async ensureWorkspace(userId: string): Promise<Workspace> {
    const cached = workspaceCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const existing = await prisma.business.findUnique({
      where: { userId },
      include: workspaceInclude,
    });

    if (
      existing?.settings &&
      existing.sources.length >= allSources.length &&
      existing.rules.length >= Object.keys(defaultRules).length
    ) {
      workspaceCache.set(userId, {
        value: existing,
        expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
      });
      return existing;
    }

    const business = existing
      ? existing
      : await prisma.business.create({
          data: { userId, name: "My Business" },
        });

    await Promise.all([
      prisma.businessSettings.upsert({
        where: { businessId: business.id },
        update: {},
        create: { businessId: business.id },
      }),
      prisma.sourceConnection.createMany({
        data: allSources.map((source) => ({
          businessId: business.id,
          source,
          connected: source === "GOOGLE",
        })),
        skipDuplicates: true,
      }),
      prisma.alertRule.createMany({
        data: (Object.keys(defaultRules) as AlertType[]).map((type) => ({
          businessId: business.id,
          type,
          name: defaultRules[type].name,
          description: defaultRules[type].description,
          enabled: defaultRules[type].enabled,
        })),
        skipDuplicates: true,
      }),
    ]);

    const workspace = await prisma.business.findUniqueOrThrow({
      where: { id: business.id },
      include: workspaceInclude,
    });

    workspaceCache.set(userId, {
      value: workspace,
      expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
    });
    return workspace;
  }

  /** Lightweight id lookup — avoids loading relations when only businessId is needed. */
  async getOrCreateBusinessId(userId: string): Promise<string> {
    const existing = await prisma.business.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const workspace = await this.ensureWorkspace(userId);
    return workspace.id;
  }

  invalidateWorkspaceCache(userId: string) {
    workspaceCache.delete(userId);
  }

  async listReviews(
    businessId: string,
    managedBusinessId?: string,
    options?: { take?: number; selectLight?: boolean },
  ) {
    const take = options?.take;
    return prisma.review.findMany({
      where: reviewScope(businessId, managedBusinessId),
      orderBy: { createdAt: "desc" },
      ...(take != null ? { take } : {}),
      ...(options?.selectLight
        ? {
            select: {
              id: true,
              author: true,
              text: true,
              rating: true,
              sentiment: true,
              source: true,
              createdAt: true,
              reviewResourceName: true,
              reviewReply: true,
              reviewRepliedAt: true,
            },
          }
        : {}),
    });
  }

  async listReviewsPage(
    businessId: string,
    managedBusinessId: string | undefined,
    options: PageOptions,
  ) {
    return prisma.review.findMany({
      where: reviewScope(businessId, managedBusinessId),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        author: true,
        text: true,
        rating: true,
        sentiment: true,
        source: true,
        createdAt: true,
        reviewResourceName: true,
        reviewReply: true,
        reviewRepliedAt: true,
      },
    });
  }

  async listRecentReviews(businessId: string, managedBusinessId: string | undefined, take = 8) {
    return prisma.review.findMany({
      where: reviewScope(businessId, managedBusinessId),
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        text: true,
        rating: true,
        sentiment: true,
        createdAt: true,
      },
    });
  }

  /**
   * Dashboard stats via SQL aggregates — never loads full review rows.
   */
  async getDashboardMetrics(
    businessId: string,
    managedBusinessId?: string,
    trendDays = 30,
  ) {
    const scope = reviewScope(businessId, managedBusinessId);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const trendStart = new Date(now);
    trendStart.setDate(now.getDate() - trendDays + 1);
    trendStart.setHours(0, 0, 0, 0);

    const [
      totalAgg,
      newToday,
      last7Days,
      prev7Days,
      sentimentGroups,
      activeAlerts,
      negativeToday,
      recentReviews,
      trendRows,
      sentimentTodayGroups,
    ] = await Promise.all([
      prisma.review.aggregate({
        where: scope,
        _count: { _all: true },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: { ...scope, createdAt: { gte: startOfDay } },
      }),
      prisma.review.count({
        where: { ...scope, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.review.count({
        where: {
          ...scope,
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.review.groupBy({
        by: ["sentiment"],
        where: scope,
        _count: { _all: true },
      }),
      prisma.alert.count({
        where: { ...scope, isRead: false },
      }),
      prisma.alert.count({
        where: {
          ...scope,
          isRead: false,
          type: "NEGATIVE_REVIEW",
          createdAt: { gte: startOfDay },
        },
      }),
      this.listRecentReviews(businessId, managedBusinessId, 8),
      prisma.review.findMany({
        where: { ...scope, createdAt: { gte: trendStart } },
        select: { rating: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.review.groupBy({
        by: ["sentiment"],
        where: { ...scope, createdAt: { gte: startOfDay } },
        _count: { _all: true },
      }),
    ]);

    const sentimentCount: Record<Sentiment, number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
    };
    for (const row of sentimentGroups) {
      sentimentCount[row.sentiment] = row._count._all;
    }

    const sentimentToday: Record<Sentiment, number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
    };
    for (const row of sentimentTodayGroups) {
      sentimentToday[row.sentiment] = row._count._all;
    }

    return {
      now,
      startOfDay,
      totalReviews: totalAgg._count._all,
      averageRating: totalAgg._avg.rating ?? 0,
      newToday,
      last7Days,
      prev7Days,
      weekDelta: last7Days - prev7Days,
      sentimentCount,
      sentimentToday,
      activeAlerts,
      negativeToday,
      recentReviews,
      trendRows,
    };
  }

  async listAlerts(
    businessId: string,
    managedBusinessId?: string,
    options?: { take?: number },
  ) {
    return prisma.alert.findMany({
      where: reviewScope(businessId, managedBusinessId),
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 100,
    });
  }

  async listAlertsPage(
    businessId: string,
    managedBusinessId: string | undefined,
    options: PageOptions,
  ) {
    return prisma.alert.findMany({
      where: reviewScope(businessId, managedBusinessId),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async countUnreadAlerts(businessId: string, managedBusinessId?: string) {
    return prisma.alert.count({
      where: {
        ...reviewScope(businessId, managedBusinessId),
        isRead: false,
      },
    });
  }

  async listManagedBusinesses(businessId: string) {
    return prisma.managedBusiness.findMany({
      where: { businessId },
      orderBy: [{ createdAt: "asc" }],
    });
  }

  async getFirstManagedBusiness(businessId: string) {
    return prisma.managedBusiness.findFirst({
      where: { businessId },
      orderBy: { createdAt: "asc" },
    });
  }

  async countReviews(businessId: string) {
    return prisma.review.count({
      where: { businessId },
    });
  }

  async getManagedBusiness(businessId: string, managedBusinessId: string) {
    return prisma.managedBusiness.findFirst({
      where: {
        id: managedBusinessId,
        businessId,
      },
    });
  }

  async resolveSelectedManagedBusiness(businessId: string, managedBusinessId?: string) {
    if (managedBusinessId) {
      const selected = await this.getManagedBusiness(businessId, managedBusinessId);
      if (selected) return selected;
    }
    return this.getFirstManagedBusiness(businessId);
  }

  async upsertManagedBusinesses(
    businessId: string,
    businesses: Array<{
      id?: string;
      name: string;
      placeId: string;
      accountName?: string | null;
      locationName?: string | null;
      mapsUri?: string | null;
    }>,
  ) {
    const normalized = businesses
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        placeId: item.placeId.trim(),
        accountName: item.accountName?.trim() || null,
        locationName: item.locationName?.trim() || null,
        mapsUri: item.mapsUri?.trim() || null,
      }))
      .filter((item) => item.name && item.placeId);

    // Parallel upserts instead of sequential loop
    return Promise.all(
      normalized.map((item) =>
        prisma.managedBusiness.upsert({
          where: item.id ? { id: item.id } : { placeId: item.placeId },
          update: {
            name: item.name,
            placeId: item.placeId,
            accountName: item.accountName,
            locationName: item.locationName,
            mapsUri: item.mapsUri,
            businessId,
          },
          create: {
            businessId,
            name: item.name,
            placeId: item.placeId,
            accountName: item.accountName,
            locationName: item.locationName,
            mapsUri: item.mapsUri,
          },
        }),
      ),
    );
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

  async markAllAlertsReadForManagedBusiness(
    businessId: string,
    managedBusinessId: string,
  ) {
    await prisma.alert.updateMany({
      where: {
        businessId,
        managedBusinessId,
        isRead: false,
      },
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
        aiProvider: string;
        sentimentModel: string;
        analysisLanguage: string;
        businessContext: string | null;
      };
      sources: Array<{ source: ReviewSource; connected: boolean }>;
    },
  ) {
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.business.update({
          where: { id: businessId },
          data: data.business,
        }),
        tx.businessSettings.update({
          where: { businessId },
          data: data.settings,
        }),
        ...data.sources.map((source) =>
          tx.sourceConnection.update({
            where: {
              businessId_source: {
                businessId,
                source: source.source,
              },
            },
            data: { connected: source.connected },
          }),
        ),
      ]);
    });
  }

  async createAlert(
    businessId: string,
    input: {
      managedBusinessId?: string | null;
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
        managedBusinessId: input.managedBusinessId,
        type: input.type,
        title: input.title,
        description: input.description,
        severity: input.severity,
        isRead: input.isRead ?? false,
      },
    });
  }

  async createReview(input: Prisma.ReviewCreateInput) {
    try {
      return await prisma.review.create({
        data: input,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        input.externalRef &&
        input.source &&
        "connect" in input.business &&
        input.business.connect?.id
      ) {
        const existing = await prisma.review.findUnique({
          where: {
            businessId_source_externalRef: {
              businessId: input.business.connect.id,
              source: input.source,
              externalRef: input.externalRef,
            },
          },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async upsertReview(input: {
    businessId: string;
    managedBusinessId?: string | null;
    author: string;
    text: string;
    rating: number;
    sentiment: Prisma.ReviewCreateInput["sentiment"];
    sentimentConfidence?: number | null;
    sentimentReason?: string | null;
    reviewTags?: string[] | null;
    source: ReviewSource;
    externalRef: string;
    reviewResourceName?: string | null;
    reviewReply?: string | null;
    reviewRepliedAt?: Date | null;
    createdAt: Date;
  }) {
    const extraFields: Record<string, unknown> = {};
    if (input.sentimentConfidence != null) {
      extraFields.sentimentConfidence = input.sentimentConfidence;
    }
    if (input.sentimentReason != null) {
      extraFields.sentimentReason = input.sentimentReason;
    }
    if (input.reviewTags != null) {
      extraFields.reviewTags = input.reviewTags;
    }

    return prisma.review.upsert({
      where: {
        businessId_source_externalRef: {
          businessId: input.businessId,
          source: input.source,
          externalRef: input.externalRef,
        },
      },
      update: {
        managedBusinessId: input.managedBusinessId,
        author: input.author,
        text: input.text,
        rating: input.rating,
        sentiment: input.sentiment,
        reviewResourceName: input.reviewResourceName,
        reviewReply: input.reviewReply,
        reviewRepliedAt: input.reviewRepliedAt,
        ...extraFields,
      } as Prisma.ReviewUncheckedUpdateInput,
      create: {
        businessId: input.businessId,
        managedBusinessId: input.managedBusinessId,
        author: input.author,
        text: input.text,
        rating: input.rating,
        sentiment: input.sentiment,
        source: input.source,
        externalRef: input.externalRef,
        reviewResourceName: input.reviewResourceName,
        reviewReply: input.reviewReply,
        reviewRepliedAt: input.reviewRepliedAt,
        createdAt: input.createdAt,
        ...extraFields,
      } as Prisma.ReviewUncheckedCreateInput,
    });
  }

  async updateReviewReply(
    reviewId: string,
    data: { reviewReply: string; reviewRepliedAt: Date },
  ) {
    return prisma.review.update({
      where: { id: reviewId },
      data,
    });
  }

  async getReviewById(reviewId: string, businessId: string) {
    return prisma.review.findFirst({
      where: {
        id: reviewId,
        businessId,
      },
      include: {
        managedBusiness: true,
      },
    });
  }
}

export const reviewMonitoringRepository = new ReviewMonitoringRepository();
