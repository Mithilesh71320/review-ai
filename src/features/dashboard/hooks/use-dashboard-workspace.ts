"use client";

import { useMemo } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardResponse } from "@/features/dashboard/types";
import { useFetchReviewsMutation } from "@/shared/hooks/use-fetch-reviews";
import { useManagedBusinessSelection } from "@/shared/hooks/use-managed-business-selection";
import { useWorkspaceSettingsQuery } from "@/shared/hooks/use-settings-query";

export function useDashboardWorkspace() {
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30);
  const settingsQuery = useWorkspaceSettingsQuery();
  const {
    setSelectedBusinessId,
    effectiveBusinessId,
    selectedBusiness,
  } = useManagedBusinessSelection(settingsQuery.data?.businesses);

  const hasPaidPlan = settingsQuery.data?.subscription.hasPaidPlan ?? false;

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(effectiveBusinessId, trendDays),
    queryFn: () =>
      fetchJson<DashboardResponse>(
        `/api/dashboard?trendDays=${trendDays}${
          effectiveBusinessId ? `&managedBusinessId=${effectiveBusinessId}` : ""
        }`,
        { cache: "no-store" },
      ),
    // Wait for settings to resolve so we fire exactly one request with the
    // real business ID instead of an eager null-ID request + a second real one.
    enabled: settingsQuery.isSuccess,
  });

  const refreshMutation = useFetchReviewsMutation({
    managedBusinessId: effectiveBusinessId,
    selectedBusiness,
    hasPaidPlan,
  });

  const data = dashboardQuery.data;
  const stats = data?.stats;
  const sentiment = data?.sentiment ?? [];
  const chartSentiment = sentiment.length
    ? sentiment.map((item) => ({
        ...item,
        // Force blue-forward palette on the dashboard (ignore server green/hsl hues).
        color:
          item.name === "Positive"
            ? "#2563EB"
            : item.name === "Neutral"
              ? "#D97706"
              : item.name === "Negative"
                ? "#DC2626"
                : item.color || "#2563EB",
      }))
    : [
        { name: "Positive", value: 0, color: "#2563EB" },
        { name: "Neutral", value: 0, color: "#D97706" },
        { name: "Negative", value: 0, color: "#DC2626" },
      ];
  const positivePercent =
    chartSentiment.find((item) => item.name === "Positive")?.value ?? 0;
  const sentimentToday = useMemo(
    () => stats?.sentimentTodayText ?? "0 positive, 0 negative, 0 neutral",
    [stats],
  );

  return {
    businesses: settingsQuery.data?.businesses,
    effectiveBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    hasPaidPlan,
    trendDays,
    setTrendDays,
    dashboardQuery,
    data,
    stats,
    chartSentiment,
    positivePercent,
    sentimentToday,
    refreshMutation,
  };
}
