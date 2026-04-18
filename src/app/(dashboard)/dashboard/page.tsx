"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

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
};

type SettingsResponse = {
  businesses: Array<{ id: string; name: string; placeId: string }>;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) }).map((_, i) => (
        <Star key={i} className="h-3 w-3 text-[#D97706]" fill="#D97706" />
      ))}
    </div>
  );
}

function sentimentColor(sentiment: string) {
  if (sentiment === "positive") return "bg-[#10B981] text-white";
  if (sentiment === "negative") return "bg-[#EF4444] text-white";
  return "bg-[#D97706] text-white";
}

export default function DashboardPage() {
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

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(effectiveBusinessId),
    queryFn: () =>
      fetchJson<DashboardResponse>(
        `/api/dashboard${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const refreshMutation = useMutation({
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) }),
      ]);
    },
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
  const positivePercent = chartSentiment.find((item) => item.name === "Positive")?.value ?? 0;

  const sentimentToday = useMemo(() => stats?.sentimentTodayText ?? "0 positive, 0 negative, 0 neutral", [stats]);

  if (dashboardQuery.isPending) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.error || !data || !stats) {
    return (
      <div className="rounded-lg border border-[#EF4444]/40 bg-[#FEE2E2] p-4 text-sm text-[#EF4444]">
        {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unable to load dashboard"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#78716C]" style={{ fontFamily: "Inter" }}>
            Overview of your review monitoring activity
          </p>
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
          <Button variant="outline" size="icon" onClick={() => void refreshMutation.mutateAsync()} disabled={refreshMutation.isPending || !selectedBusiness}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!settingsQuery.data?.businesses.length && (
        <div className="rounded-lg border border-[#D97706]/40 bg-[#FEF3C7] px-4 py-3 text-sm text-[#1C1917]">
          Add at least one business in Settings to view business-specific dashboard data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-[#78716C]">Average Rating</p>
              <p className="text-4xl font-bold">{stats.averageRating}</p>
              <div className="flex items-center gap-1 text-sm text-[#10B981]">
                <TrendingUp className="h-3 w-3" />
                <span>{stats.monthlyDelta > 0 ? "+" : ""}{stats.monthlyDelta} from baseline</span>
              </div>
            </div>
            <Star className="h-6 w-6 text-[#D97706]" fill="#D97706" />
          </div>
        </Card>

        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-[#78716C]">Total Reviews</p>
              <p className="text-4xl font-bold">{stats.totalReviews}</p>
              <div className="text-sm text-[#10B981]">{stats.weeklyDelta > 0 ? "+" : ""}{stats.weeklyDelta} this week</div>
            </div>
            <MessageCircle className="h-6 w-6 text-[#0D9488]" />
          </div>
        </Card>

        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-[#78716C]">New Today</p>
              <p className="text-4xl font-bold">{stats.newToday}</p>
              <p className="text-xs text-[#78716C]">{sentimentToday}</p>
            </div>
            <Sparkles className="h-6 w-6 text-[#0D9488]" />
          </div>
        </Card>

        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-[#78716C]">Active Alerts</p>
              <p className="text-4xl font-bold">{stats.activeAlerts}</p>
              <div className="text-sm text-[#10B981]">{stats.activeAlertsText}</div>
            </div>
            <AlertTriangle className="h-6 w-6 text-[#D97706]" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-3">
          <div className="space-y-4">
            <div>
              <h3 className="text-base text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Rating Trend</h3>
              <p className="text-xs text-[#78716C]">Your average rating over time</p>
            </div>
            <div className="flex gap-2">
              {["30D", "60D", "90D"].map((period, index) => (
                <Button key={period} variant={index === 0 ? "default" : "outline"} size="sm" className={index === 0 ? "rounded-full bg-[#0D9488] text-white" : "rounded-full"}>
                  {period}
                </Button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#78716C" }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#78716C" }} />
                <Tooltip />
                <Area type="monotone" dataKey="rating" stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#colorRating)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-2">
          <div className="space-y-4">
            <h3 className="text-base text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Sentiment Breakdown</h3>
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={140} height={140}>
                  <Pie data={chartSentiment} cx={70} cy={70} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {chartSentiment.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{positivePercent}%</div>
              </div>
              <div className="mt-4 w-full space-y-2">
                {chartSentiment.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-[#78716C]">{item.name}</span>
                    </div>
                    <span className="text-sm">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Recent Reviews</h3>
          <Button variant="link" className="text-[#0D9488]">View all</Button>
        </div>
        <div className="space-y-4">
          {data.recentReviews.map((review, index) => (
            <div key={review.id} className={`flex gap-4 py-4 ${index < data.recentReviews.length - 1 ? "border-b border-[#E7E5E4]" : ""}`}>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className="border-0 bg-[#4285F4] text-xs text-white">Google</Badge>
                  <Stars rating={review.rating} />
                  <span className="text-xs text-[#78716C] md:ml-auto">{new Date(review.time).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[#78716C]">{review.text}</p>
              </div>
              <Badge className={`${sentimentColor(review.sentiment)} h-fit border-0`}>{review.sentiment}</Badge>
            </div>
          ))}
          {data.recentReviews.length === 0 && <p className="text-sm text-[#78716C]">No reviews yet.</p>}
        </div>
      </Card>
    </div>
  );
}



