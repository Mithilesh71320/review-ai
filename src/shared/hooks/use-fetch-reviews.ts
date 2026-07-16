"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ManagedBusinessSummary } from "@/shared/types/settings";

type FetchReviewsResult = {
  storedCount: number;
  reviewLimitReached?: boolean;
  reviewLimit?: number | null;
};

type Options = {
  managedBusinessId: string | null;
  selectedBusiness?: Pick<ManagedBusinessSummary, "name" | "placeId">;
  hasPaidPlan: boolean;
  /** Extra query keys to invalidate after a successful sync. */
  invalidateKeys?: ReadonlyArray<readonly unknown[]>;
  onSuccessMessage?: (result: FetchReviewsResult) => void;
  onErrorMessage?: (message: string) => void;
};

/**
 * Shared mutation for POST /api/fetch-reviews used by Reviews, Dashboard, Alerts.
 * Invalidations are fire-and-forget so UI buttons are not stuck pending on slow refetches.
 */
export function useFetchReviewsMutation(options: Options) {
  const queryClient = useQueryClient();
  const {
    managedBusinessId,
    selectedBusiness,
    hasPaidPlan,
    invalidateKeys = [],
    onSuccessMessage,
    onErrorMessage,
  } = options;

  return useMutation({
    mutationFn: async () => {
      if (!hasPaidPlan) {
        throw new Error("Paid subscription required to sync reviews. Open Billing to continue.");
      }

      const placeId = selectedBusiness?.placeId?.trim();
      const businessName = selectedBusiness?.name?.trim();

      if (!placeId && !businessName) {
        throw new Error(
          "Add a business name or Google Place ID in Settings before fetching reviews.",
        );
      }

      return fetchJson<FetchReviewsResult>("/api/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBusinessId,
          placeId,
          businessName,
        }),
      });
    },
    onSuccess: (result) => {
      onSuccessMessage?.(result);

      const defaultKeys = [
        queryKeys.reviews(managedBusinessId),
        queryKeys.dashboard(managedBusinessId),
        queryKeys.alerts(managedBusinessId),
        queryKeys.insights(managedBusinessId),
      ] as const;

      for (const key of [...defaultKeys, ...invalidateKeys]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (error) => {
      onErrorMessage?.(
        error instanceof Error ? error.message : "Failed to fetch latest reviews.",
      );
    },
  });
}
