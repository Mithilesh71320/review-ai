"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts(effectiveBusinessId),
    queryFn: () =>
      fetchJson<AlertsResponse>(
        `/api/alerts${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const refreshAlerts = async () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) });
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

  return {
    businesses: settingsQuery.data?.businesses,
    effectiveBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    hasPaidPlan,
    alertsQuery,
    data: alertsQuery.data,
    hasAlerts: Boolean(alertsQuery.data?.alerts.length),
    savingRule,
    syncReviewsMutation,
    markAllReadMutation,
    handleRuleToggle,
  };
}
