"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Award, ChevronDown, RefreshCw, Shield, TrendingDown } from "lucide-react";
import { ListPageSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type AlertsResponse = {
  unreadCount: number;
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    read: boolean;
    createdAt: string;
  }>;
  rules: Array<{
    id: string;
    type: "NEGATIVE_REVIEW" | "RATING_DROP" | "TREND" | "POSITIVE_SPIKE";
    name: string;
    description: string;
    enabled: boolean;
  }>;
};

type SettingsResponse = {
  businesses: Array<{ id: string; name: string; placeId: string }>;
};

function iconFor(type: string) {
  if (type === "rating_drop") return TrendingDown;
  if (type === "positive_spike") return Award;
  return AlertTriangle;
}

function colorFor(severity: string) {
  if (severity === "high") return "#EF4444";
  if (severity === "medium") return "#D97706";
  return "#0D9488";
}

export default function AlertsPage() {
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });

  const effectiveBusinessId = selectedBusinessId ?? settingsQuery.data?.businesses[0]?.id ?? null;
  const selectedBusiness =
    settingsQuery.data?.businesses.find((business) => business.id === effectiveBusinessId) ??
    settingsQuery.data?.businesses[0];

  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts(effectiveBusinessId),
    queryFn: () =>
      fetchJson<AlertsResponse>(
        `/api/alerts${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const refreshAlerts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(effectiveBusinessId) }),
    ]);
  };

  const syncReviewsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBusiness) return;
      await fetchJson<{ storedCount: number }>("/api/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBusinessId: effectiveBusinessId,
          placeId: selectedBusiness.placeId,
          businessName: selectedBusiness.name,
        }),
      });
    },
    onSuccess: refreshAlerts,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead", managedBusinessId: effectiveBusinessId }),
      }),
    onSuccess: refreshAlerts,
  });

  const handleRuleToggle = async (type: AlertsResponse["rules"][number]["type"], enabled: boolean) => {
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

  const data = alertsQuery.data;
  const hasAlerts = Boolean(data?.alerts.length);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
            Alerts
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={effectiveBusinessId ?? "none"} onValueChange={(value) => setSelectedBusinessId(value === "none" ? null : value)}>
            <SelectTrigger className="h-10 w-56 rounded-full border-[#0D9488] text-[#0D9488]">
              <SelectValue placeholder="Select business" />
              <ChevronDown className="ml-2 h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              {settingsQuery.data?.businesses.length ? (
                settingsQuery.data.businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="none">No businesses added</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" disabled={syncReviewsMutation.isPending || !selectedBusiness} onClick={() => void syncReviewsMutation.mutateAsync()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {hasAlerts && (
            <Button variant="outline" disabled={markAllReadMutation.isPending} onClick={() => void markAllReadMutation.mutateAsync()}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {alertsQuery.isPending && !data && <ListPageSkeleton />}
      {alertsQuery.error && (
        <div className="rounded-lg border border-[#EF4444]/40 bg-[#FEE2E2] p-4 text-sm text-[#EF4444]">
          {alertsQuery.error instanceof Error ? alertsQuery.error.message : "Failed to load alerts"}
        </div>
      )}

      {!alertsQuery.isPending && !alertsQuery.error && data && (
        <>
          {!hasAlerts ? (
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="max-w-md space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF9]">
                    <Shield className="h-10 w-10 text-[#0D9488]" />
                  </div>
                </div>
                <h2 className="text-xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
                  You&apos;re all clear
                </h2>
                <p className="text-sm text-[#78716C]">No new alerts. We&apos;ll notify you the moment something needs attention.</p>
                <Button variant="link" className="text-[#0D9488]">Configure alert settings</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert) => {
                const Icon = iconFor(alert.type);
                const color = colorFor(alert.severity);
                return (
                  <Card key={alert.id} className={`cursor-pointer rounded-xl border-[#E7E5E4] p-5 shadow-sm transition-colors hover:bg-[#FAFAF9] ${!alert.read ? "bg-[#FEF3C7]/20" : "bg-white"}`}>
                    <div className="flex gap-4">
                      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <div className="flex flex-1 gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-sm font-semibold text-[#1C1917]">{alert.title}</h3>
                            <span className="text-xs text-[#78716C]">{new Date(alert.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-[#78716C]">{alert.description}</p>
                          <Badge variant="secondary" className="mt-2 border-0 bg-[#F8F6F1] text-xs text-[#78716C]">
                            {selectedBusiness?.name ?? "Business"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-[#1C1917]">Alert Rules</h3>
            <div className="space-y-4">
              {data.rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between border-b border-[#E7E5E4] pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{rule.name}</p>
                    <p className="text-xs text-[#78716C]">{rule.description}</p>
                  </div>
                  <Switch checked={rule.enabled} disabled={savingRule === rule.type} onCheckedChange={(checked) => void handleRuleToggle(rule.type, checked)} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}



