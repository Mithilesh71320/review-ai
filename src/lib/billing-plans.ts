export type BillingPlanKey = "starter" | "growth" | "pro";

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  description: string;
  price: number;
  currency: "USD";
  period: "month";
  features: string[];
  cta: string;
  popular?: boolean;
  limits: {
    maxBusinesses: number | null;
    maxStoredReviews: number | null;
  };
  capabilities: {
    aiResponses: boolean;
    advancedAiRecommendations: boolean;
    businessContext: boolean;
    reviewNotifications: boolean;
    dedicatedSupport: boolean;
  };
};

export const defaultBillingPlans: BillingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    description: "For solo operators who need fast review response workflows.",
    price: 19,
    currency: "USD",
    period: "month",
    features: [
      "2 businesses",
      "100 stored reviews",
      "AI responses",
      "Review notifications",
    ],
    cta: "Subscribe",
    limits: {
      maxBusinesses: 2,
      maxStoredReviews: 100,
    },
    capabilities: {
      aiResponses: true,
      advancedAiRecommendations: false,
      businessContext: false,
      reviewNotifications: true,
      dedicatedSupport: false,
    },
  },
  {
    key: "growth",
    name: "Growth",
    description:
      "For growing teams managing several locations and deeper review analysis.",
    price: 29,
    currency: "USD",
    period: "month",
    features: [
      "5 businesses",
      "500 stored reviews",
      "Advanced AI recommendation",
      "Review notifications",
    ],
    cta: "Subscribe",
    popular: true,
    limits: {
      maxBusinesses: 5,
      maxStoredReviews: 500,
    },
    capabilities: {
      aiResponses: true,
      advancedAiRecommendations: true,
      businessContext: false,
      reviewNotifications: true,
      dedicatedSupport: false,
    },
  },
  {
    key: "pro",
    name: "Pro",
    description:
      "For agencies or multi-location brands that want unlimited scale and richer AI context.",
    price: 49,
    currency: "USD",
    period: "month",
    features: [
      "Unlimited businesses",
      "Unlimited stored reviews",
      "Add business context to AI",
      "Review notifications",
      "Dedicated support",
    ],
    cta: "Subscribe",
    limits: {
      maxBusinesses: null,
      maxStoredReviews: null,
    },
    capabilities: {
      aiResponses: true,
      advancedAiRecommendations: true,
      businessContext: true,
      reviewNotifications: true,
      dedicatedSupport: true,
    },
  },
];

const billingPlanMap = new Map(defaultBillingPlans.map((plan) => [plan.key, plan]));

export function formatPlanPrice(plan: BillingPlan) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.price);
}

export function getBillingPlans() {
  return defaultBillingPlans;
}

export function getBillingPlanByKey(planKey: BillingPlanKey | null | undefined) {
  if (!planKey) {
    return null;
  }

  return billingPlanMap.get(planKey) ?? null;
}
