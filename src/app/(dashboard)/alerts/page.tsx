"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  selectedBusinessId: string | null;
};

type SettingsResponse = {
  businesses: Array<{
    id: string;
    name: string;
    placeId: string;
  }>;
};

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "high") return <Badge variant="destructive">High</Badge>;
  if (severity === "medium")
    return <Badge className="bg-warning text-warning-foreground">Medium</Badge>;
  return <Badge variant="secondary">Low</Badge>;
}

function AlertIcon({ type }: { type: string }) {
  if (type === "negative_review")
    return <XCircle className="h-5 w-5 text-destructive" />;
  if (type === "rating_drop")
    return <AlertTriangle className="h-5 w-5 text-warning" />;
  if (type === "positive_spike")
    return <CheckCircle className="h-5 w-5 text-success" />;
  return <Bell className="h-5 w-5 text-muted-foreground" />;
}

export default function AlertsPage() {
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });
  const effectiveBusinessId =
    selectedBusinessId ?? settingsQuery.data?.businesses[0]?.id ?? null;
  const selectedBusiness =
    settingsQuery.data?.businesses.find((business) => business.id === effectiveBusinessId) ??
    settingsQuery.data?.businesses[0];
  const { data, isPending, error } = useQuery({
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
      if (selectedBusiness?.placeId?.trim() || selectedBusiness?.name?.trim()) {
        await fetchJson<{ storedCount: number }>("/api/fetch-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managedBusinessId: effectiveBusinessId,
            placeId: selectedBusiness?.placeId?.trim(),
            businessName: selectedBusiness?.name?.trim(),
          }),
        });
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Alerts
          </h1>
          <p className="text-muted-foreground">Monitor and manage review alerts.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={effectiveBusinessId ?? "none"}
            onValueChange={(value) => setSelectedBusinessId(value === "none" ? null : value)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {settingsQuery.data?.businesses.length ? (
                settingsQuery.data.businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none">No businesses added</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void syncReviewsMutation.mutateAsync()}
            disabled={syncReviewsMutation.isPending || !selectedBusiness}
          >
            <RefreshCw className="h-4 w-4" />
            {syncReviewsMutation.isPending ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={markAllReadMutation.isPending}
            onClick={() => void markAllReadMutation.mutateAsync()}
          >
            <CheckCircle className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {!settingsQuery.data?.businesses.length && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Add at least one business in Settings to view business-specific alerts.
        </div>
      )}

      {isPending && <div className="text-sm text-muted-foreground">Loading alerts...</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load alerts"}
        </div>
      )}

      {!isPending && !error && data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>{data.unreadCount} unread alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0 ${
                      !alert.read ? "bg-accent/30 -mx-4 px-4 py-3 rounded-lg" : ""
                    }`}
                  >
                    <AlertIcon type={alert.type} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{alert.title}</span>
                        <SeverityBadge severity={alert.severity} />
                        {!alert.read && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {data.alerts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No alerts available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                Configure which alerts you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      disabled={savingRule === rule.type}
                      onCheckedChange={(checked) => void handleRuleToggle(rule.type, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
