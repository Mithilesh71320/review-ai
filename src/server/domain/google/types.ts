/** Google API payload shapes used by monitoring integrations. */

export type GoogleReview = {
  author_name?: string;
  text?: string;
  rating?: number;
  time?: number;
  review_resource_name?: string;
  review_reply?: string;
  review_replied_at?: string;
};

export type GoogleTokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type GoogleAccountListResponse = {
  accounts?: Array<{
    name: string;
    accountName?: string;
    type?: string;
  }>;
};

export type GoogleBusinessLocationsResponse = {
  locations?: Array<{
    name: string;
    title?: string;
    storefrontAddress?: {
      addressLines?: string[];
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
    };
    metadata?: {
      placeId?: string;
      mapsUri?: string;
      newReviewUri?: string;
    };
  }>;
};

export type GoogleLocationReviewsResponse = {
  reviews?: Array<{
    name?: string;
    reviewer?: {
      displayName?: string;
    };
    starRating?: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
    comment?: string;
    createTime?: string;
    reviewReply?: {
      comment?: string;
      updateTime?: string;
    };
  }>;
  averageRating?: number;
};

export type GooglePlaceSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export class GoogleApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "GoogleApiError";
    this.statusCode = statusCode;
  }
}

export function googleStarRatingToNumber(
  value: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | undefined,
) {
  const mapping = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  } as const;

  return value ? mapping[value] : undefined;
}

export function toUnixSeconds(iso: string | undefined) {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return undefined;
  return Math.floor(ms / 1000);
}
