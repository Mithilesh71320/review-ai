"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  TrendingDown,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type DashboardResponse = {
  stats: {
    averageRating: number;
    totalReviews: number;
    newToday: number;
    activeAlerts: number;
    monthlyDelta: number;
    weeklyDelta: number;
    sentimentTodayText: string;
    activeAlertsText: string;
  };
  trend: Array<{ month: string; rating: number }>;
  sentiment: Array<{ name: string; value: number; color: string }>;
  recentReviews: Array<{
    id: string;
    text: string;
    rating: number;
    sentiment: string;
    time: string;
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const variant =
    sentiment === "positive"
      ? "default"
      : sentiment === "negative"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{sentiment}</Badge>;
}

export default function DashboardPage() {
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
    queryKey: queryKeys.dashboard(effectiveBusinessId),
    queryFn: () =>
      fetchJson<DashboardResponse>(
        `/api/dashboard${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const refreshMutation = useMutation({
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) }),
      ]);
    },
  });

  const stats = data?.stats;
  const trend = data?.trend ?? [];
  const sentiment = data?.sentiment ?? [];
  const recentReviews = data?.recentReviews ?? [];

  const monthlyTrendIcon = useMemo(() => {
    if (!stats || stats.monthlyDelta < 0) {
      return <TrendingDown className="h-3 w-3 text-destructive" />;
    }
    return <TrendingUp className="h-3 w-3 text-success" />;
  }, [stats]);

  if (isPending) {
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "Unable to load dashboard"}
      </div>
    );
  }

  const safeStats = data.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your review monitoring activity.
          </p>
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
            onClick={() => void refreshMutation.mutateAsync()}
            disabled={refreshMutation.isPending || !selectedBusiness}
          >
            <RefreshCw className="h-4 w-4" />
            {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {!settingsQuery.data?.businesses.length && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Add at least one business in Settings to view business-specific dashboard data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.averageRating}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {monthlyTrendIcon}
              <span className={safeStats.monthlyDelta < 0 ? "text-destructive" : "text-success"}>
                {safeStats.monthlyDelta > 0 ? "+" : ""}
                {safeStats.monthlyDelta}
              </span>{" "}
              from baseline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totalReviews}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-success">
                {safeStats.weeklyDelta > 0 ? "+" : ""}
                {safeStats.weeklyDelta}
              </span>{" "}
              this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.newToday}</div>
            <p className="text-xs text-muted-foreground">
              {safeStats.sentimentTodayText}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.activeAlerts}</div>
            <p className="text-xs text-destructive">{safeStats.activeAlertsText}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating Trend</CardTitle>
            <CardDescription>Average rating over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trend}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="rating" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Breakdown</CardTitle>
            <CardDescription>Distribution of review sentiments</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={sentiment}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {sentiment.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {sentiment.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>Latest customer reviews from backend data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <div
                key={review.id}
                className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <SentimentBadge sentiment={review.sentiment} />
                  </div>
                  <p className="text-sm text-foreground">&ldquo;{review.text}&rdquo;</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.time).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {recentReviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
