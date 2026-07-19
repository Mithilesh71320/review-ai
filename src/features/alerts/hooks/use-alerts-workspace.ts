"use client";

import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AlertsResponse } from "@/features/alerts/types";
import { useFetchReviewsMutation } from "@/shared/hooks/use-fetch-reviews";
import { useManagedBusinessSelection } from "@/shared/hooks/use-managed-business-selection";
import { useWorkspaceSettingsQuery } from "@/shared/hooks/use-settings-query";

export function useAlertsWorkspace() {
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const settingsQuery = useWorkspaceSettingsQuery();
  const {
    setSelectedBusinessId,
    effectiveBusinessId,
    selectedBusiness,
  } = useManagedBusinessSelection(settingsQuery.data?.businesses);

  const hasPaidPlan = settingsQuery.data?.subscription.hasPaidPlan ?? false;

  const alertsQuery = useInfiniteQuery({
    queryKey: queryKeys.alerts(effectiveBusinessId),
    queryFn: ({ pageParam }) => {
      const searchParams = new URLSearchParams({ limit: "25" });
      if (effectiveBusinessId) {
        searchParams.set("managedBusinessId", effectiveBusinessId);
      }
      if (pageParam) {
        searchParams.set("cursor", pageParam);
      }
      return fetchJson<AlertsResponse>(`/api/alerts?${searchParams.toString()}`, {
        cache: "no-store",
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const refreshAlerts = async () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.alertBadge(effectiveBusinessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard(effectiveBusinessId),
    });
  };

  const syncReviewsMutation = useFetchReviewsMutation({
    managedBusinessId: effectiveBusinessId,
    selectedBusiness,
    hasPaidPlan,
    onSuccessMessage: () => {
      void refreshAlerts();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markAllRead",
          managedBusinessId: effectiveBusinessId,
        }),
      }),
    onSuccess: () => {
      void refreshAlerts();
    },
  });

  const handleRuleToggle = async (
    type: AlertsResponse["rules"][number]["type"],
    enabled: boolean,
  ) => {
    setSavingRule(type);
    try {
      await fetchJson<{ ok: true }>("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleRule", type, enabled }),
      });
      await refreshAlerts();
    } finally {
      setSavingRule(null);
    }
  };

  const firstPage = alertsQuery.data?.pages[0];
  const alerts = alertsQuery.data?.pages.flatMap((page) => page.alerts) ?? [];
  const data = firstPage
    ? {
        ...firstPage,
        alerts,
      }
    : undefined;

  return {
    businesses: settingsQuery.data?.businesses,
    effectiveBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    hasPaidPlan,
    alertsQuery,
    data,
    hasAlerts: alerts.length > 0,
    hasMoreAlerts: alertsQuery.hasNextPage,
    alertsFetchingNextPage: alertsQuery.isFetchingNextPage,
    savingRule,
    syncReviewsMutation,
    markAllReadMutation,
    handleRuleToggle,
    loadMoreAlerts: alertsQuery.fetchNextPage,
  };
}
