import type { ReviewSource } from "@prisma/client";

/** Body shape for PUT /api/settings */
export type SettingsPayload = {
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
    businessContext?: string;
  };
  sources: Array<{ key: ReviewSource; connected: boolean }>;
  businesses: Array<{
    id?: string;
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }>;
};
