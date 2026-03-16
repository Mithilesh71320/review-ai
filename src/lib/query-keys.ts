export const queryKeys = {
  dashboard: ["dashboard"] as const,
  reviews: ["reviews"] as const,
  alerts: ["alerts"] as const,
  settings: ["settings"] as const,
  googleBusinesses: ["google-businesses"] as const,
  googlePlaceSearch: (query: string) => ["google-place-search", query] as const,
};
