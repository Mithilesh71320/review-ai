"use client";

import { useEffect, useState } from "react";
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
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load alerts");
      }
      const payload = (await res.json()) as AlertsResponse;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load alerts";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkAllRead = async () => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    await load();
  };

  const handleRuleToggle = async (
    type: AlertsResponse["rules"][number]["type"],
    enabled: boolean,
  ) => {
    setSavingRule(type);
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleRule", type, enabled }),
    });
    setSavingRule(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Alerts
          </h1>
          <p className="text-muted-foreground">Monitor and manage review alerts.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void handleMarkAllRead()}>
          <CheckCircle className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading alerts...</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
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
