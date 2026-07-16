import { type BillingPlan, type BillingPlanKey, getBillingPlanByKey } from "@/lib/billing-plans";
import { clerkClient } from "@clerk/nextjs/server";

export type SubscriptionAccess = {
  planKey: BillingPlanKey | null;
  plan: BillingPlan | null;
  hasPaidPlan: boolean;
  limits: {
    maxBusinesses: number;
    maxStoredReviews: number;
  };
  capabilities: {
    aiResponses: boolean;
    advancedAiRecommendations: boolean;
    businessContext: boolean;
    reviewNotifications: boolean;
    dedicatedSupport: boolean;
  };
};

const planResolutionOrder: BillingPlanKey[] = ["pro", "growth", "starter"];

function emptyAccess(): SubscriptionAccess {
  return {
    planKey: null,
    plan: null,
    hasPaidPlan: false,
    limits: {
      maxBusinesses: 0,
      maxStoredReviews: 0,
    },
    capabilities: {
      aiResponses: false,
      advancedAiRecommendations: false,
      businessContext: false,
      reviewNotifications: false,
      dedicatedSupport: false,
    },
  };
}

function buildAccess(planKey: BillingPlanKey | null): SubscriptionAccess {
  const plan = getBillingPlanByKey(planKey);

  if (!plan) {
    return emptyAccess();
  }

  return {
    planKey,
    plan,
    hasPaidPlan: true,
    limits: {
      maxBusinesses: plan.limits.maxBusinesses ?? Number.MAX_SAFE_INTEGER,
      maxStoredReviews: plan.limits.maxStoredReviews ?? Number.MAX_SAFE_INTEGER,
    },
    capabilities: plan.capabilities,
  };
}

function normalizePlanSlug(slug: string | null | undefined): string | null {
  if (!slug) {
    return null;
  }

  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes(":")) {
    return normalized.split(":").pop() ?? null;
  }

  return normalized;
}

export function resolveSubscriptionAccess(has?: ((params: { plan: string }) => boolean) | null): SubscriptionAccess {
  const planKey =
    planResolutionOrder.find((candidate) => {
      try {
        return Boolean(has?.({ plan: candidate }));
      } catch {
        return false;
      }
    }) ?? null;

  return buildAccess(planKey);
}

async function resolveDevelopmentAccessFromBilling(userId: string): Promise<SubscriptionAccess | null> {
  try {
    const client = await clerkClient();
    const subscription = await client.billing.getUserBillingSubscription(userId);
    const activeLikeItems = subscription.subscriptionItems.filter((item) => {
      const status = item.status.toLowerCase();
      return !["ended", "canceled", "abandoned", "incomplete_expired"].includes(status);
    });

    if (!activeLikeItems.length) {
      return null;
    }

    const newestItem = [...activeLikeItems].sort((a, b) => {
      const aTime = Math.max(a.updatedAt ?? 0, a.createdAt ?? 0);
      const bTime = Math.max(b.updatedAt ?? 0, b.createdAt ?? 0);
      return bTime - aTime;
    })[0];

    const slug = normalizePlanSlug(newestItem.plan?.slug);
    const planKey = planResolutionOrder.find((candidate) => candidate === slug) ?? null;
    return buildAccess(planKey);
  } catch {
    return null;
  }
}

export async function resolveSubscriptionAccessForUser(params: {
  userId: string;
  has?: ((data: { plan: string }) => boolean) | null;
}): Promise<SubscriptionAccess> {
  if (process.env.NODE_ENV === "development") {
    const devAccess = await resolveDevelopmentAccessFromBilling(params.userId);
    if (devAccess) {
      return devAccess;
    }
  }

  return resolveSubscriptionAccess(params.has);
}

export function assertPaidPlan(access: SubscriptionAccess) {
  if (!access.hasPaidPlan) {
    throw new Error("Paid subscription required. Open Billing and subscribe to continue.");
  }
}

export function assertBusinessLimit(access: SubscriptionAccess, businessCount: number) {
  assertPaidPlan(access);

  if (businessCount > access.limits.maxBusinesses) {
    throw new Error(
      `Your ${access.plan?.name ?? "current"} plan allows up to ${access.limits.maxBusinesses} businesses. Upgrade to add more.`,
    );
  }
}

export function assertAdvancedAi(access: SubscriptionAccess) {
  assertPaidPlan(access);

  if (!access.capabilities.advancedAiRecommendations) {
    throw new Error("Growth or Pro plan required for advanced AI recommendations.");
  }
}

export function assertAiReplies(access: SubscriptionAccess) {
  assertPaidPlan(access);

  if (!access.capabilities.aiResponses) {
    throw new Error("Starter or higher plan required for AI review replies.");
  }
}
