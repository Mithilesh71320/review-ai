/** Shared settings / subscription shapes used across dashboard features. */

export type ManagedBusinessSummary = {
  id: string;
  name: string;
  placeId: string;
};

export type SubscriptionSummary = {
  planKey?: "starter" | "growth" | "pro" | null;
  planName: string | null;
  hasPaidPlan: boolean;
  limits?: {
    maxBusinesses?: number | null;
    maxStoredReviews?: number | null;
  };
  capabilities?: {
    aiResponses?: boolean;
    advancedAiRecommendations?: boolean;
    businessContext?: boolean;
    reviewNotifications?: boolean;
    dedicatedSupport?: boolean;
  };
  usage?: {
    businesses?: number;
    storedReviews?: number;
  };
};

/** Minimal settings payload shared by dashboard / reviews / alerts. */
export type WorkspaceSettingsSummary = {
  businesses: ManagedBusinessSummary[];
  subscription: SubscriptionSummary;
};

/** Full settings payload for the Settings page. */
export type SettingsResponse = {
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
    provider: string;
    sentimentModel: string;
    analysisLanguage: string;
    autoRespond: boolean;
    businessContext: string;
  };
  sources: Array<{
    source: string;
    key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR";
    connected: boolean;
    available?: boolean;
  }>;
  businesses: Array<{
    id?: string;
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }>;
  subscription: {
    planKey: "starter" | "growth" | "pro" | null;
    planName: string | null;
    hasPaidPlan: boolean;
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
    usage: {
      businesses: number;
      storedReviews: number;
    };
  };
};

export const emptySettingsResponse = (): SettingsResponse => ({
  business: { name: "", email: "", phone: "", website: "", placeId: "" },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
  },
  ai: {
    provider: "gemini",
    sentimentModel: "balanced",
    analysisLanguage: "en",
    autoRespond: true,
    businessContext: "",
  },
  sources: [],
  businesses: [],
  subscription: {
    planKey: null,
    planName: null,
    hasPaidPlan: false,
    limits: { maxBusinesses: 0, maxStoredReviews: 0 },
    capabilities: {
      aiResponses: false,
      advancedAiRecommendations: false,
      businessContext: false,
      reviewNotifications: false,
      dedicatedSupport: false,
    },
    usage: { businesses: 0, storedReviews: 0 },
  },
});
