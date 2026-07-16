"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardResponse } from "@/features/dashboard/types";
import { useFetchReviewsMutation } from "@/shared/hooks/use-fetch-reviews";
import { useManagedBusinessSelection } from "@/shared/hooks/use-managed-business-selection";
import { useWorkspaceSettingsQuery } from "@/shared/hooks/use-settings-query";

export function useDashboardWorkspace() {
  const settingsQuery = useWorkspaceSettingsQuery();
  const {
    setSelectedBusinessId,
    effectiveBusinessId,
    selectedBusiness,
  } = useManagedBusinessSelection(settingsQuery.data?.businesses);

  const hasPaidPlan = settingsQuery.data?.subscription.hasPaidPlan ?? false;

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(effectiveBusinessId),
    queryFn: () =>
      fetchJson<DashboardResponse>(
        `/api/dashboard${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
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
    ? sentiment.map((item) => ({ ...item, color: item.color || "#0D9488" }))
    : [
        { name: "Positive", value: 0, color: "#0D9488" },
        { name: "Neutral", value: 0, color: "#D97706" },
        { name: "Negative", value: 0, color: "#EF4444" },
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
    dashboardQuery,
    data,
    stats,
    chartSentiment,
    positivePercent,
    sentimentToday,
    refreshMutation,
  };
}
