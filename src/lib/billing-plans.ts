
export type TrialOption = {
  days: 7 | 14 | 30;
  label: string;
  description: string;
};

export type BillingPlan = {
  key: "free" | "starter" | "growth" | "pro";
  name: string;
  description: string;
  price: number;
  currency: "USD";
  period: "month";
  features: string[];
  cta: string;
  popular?: boolean;
};

export const trialOptions: TrialOption[] = [
  { days: 7, label: "7 days", description: "Short product demo trial" },
  { days: 14, label: "14 days", description: "Default trial for new teams" },
  { days: 30, label: "1 month", description: "Extended trial for larger businesses" },
];

export const defaultTrialDays = 14;

export const defaultBillingPlans: BillingPlan[] = [
  {
    key: "free",
    name: "Free Plan",
    description: "For testing ReviewAI with one business.",
    price: 0,
    currency: "USD",
    period: "month",
    features: ["1 business", "50 stored reviews", "Basic dashboard", "Manual refresh"],
    cta: "Current starter plan",
  },
  {
    key: "starter",
    name: "Starter",
    description: "For solo salons and small local businesses.",
    price: 29,
    currency: "USD",
    period: "month",
    features: ["3 businesses", "500 reviews/mo", "AI responses", "Email support"],
    cta: "Start free trial",
  },
  {
    key: "growth",
    name: "Growth",
    description: "For growing teams managing multiple locations.",
    price: 79,
    currency: "USD",
    period: "month",
    features: ["10 businesses", "2000 reviews/mo", "Advanced AI", "Priority support"],
    cta: "Start free trial",
    popular: true,
  },
  {
    key: "pro",
    name: "Pro",
    description: "For agencies and multi-location operators.",
    price: 199,
    currency: "USD",
    period: "month",
    features: ["Unlimited businesses", "Unlimited reviews", "Custom AI", "Dedicated support"],
    cta: "Start free trial",
  },
];

export function formatPlanPrice(plan: BillingPlan) {
  if (plan.price === 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.price);
}

export function getBillingPlans() {
  // Future admin dashboard can replace this with an API/database backed source.
  return defaultBillingPlans;
}

