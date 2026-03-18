export const queryKeys = {
  dashboard: (managedBusinessId: string | null) =>
    ["dashboard", managedBusinessId ?? "default"] as const,
  reviews: (managedBusinessId: string | null) =>
    ["reviews", managedBusinessId ?? "default"] as const,
  alerts: (managedBusinessId: string | null) =>
    ["alerts", managedBusinessId ?? "default"] as const,
  insights: (managedBusinessId: string | null) =>
    ["insights", managedBusinessId ?? "default"] as const,
  settings: ["settings"] as const,
  googleBusinesses: ["google-businesses"] as const,
  googlePlaceSearch: (query: string) => ["google-place-search", query] as const,
};
