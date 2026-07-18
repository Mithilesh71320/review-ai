"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboardWorkspace } from "@/features/dashboard/hooks/use-dashboard-workspace";
import { BusinessSelect } from "@/shared/components/business-select";
import { PaidPlanBanner } from "@/shared/components/paid-plan-banner";

/**
 * Lazy-load Recharts (~200 KB) so stat cards + header paint first (LCP).
 * Both chart components share the same dynamic chunk, so once one loads
 * the other is instantly available — no double-download.
 */
const chartLoadingFallback = (
  <div className="flex h-[220px] items-center justify-center text-sm text-[#78716C]">
    Loading charts…
  </div>
);

const RatingTrendChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-charts").then(
      (mod) => mod.RatingTrendChart,
    ),
  { ssr: false, loading: () => chartLoadingFallback },
);

const SentimentDonutChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-charts").then(
      (mod) => mod.SentimentDonutChart,
    ),
  { ssr: false, loading: () => chartLoadingFallback },
);

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

const trendRangeOptions = [
  { days: 7, label: "1 Week" },
  { days: 30, label: "1 Month" },
  { days: 90, label: "3 Months" },
] as const;

export function DashboardView() {
  const {
    businesses,
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
    trendDays,
    setTrendDays,
    refreshMutation,
  } = useDashboardWorkspace();

  if (dashboardQuery.isPending) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.error || !data || !stats) {
    return (
      <div className="rounded-lg border border-[#EF4444]/40 bg-[#FEE2E2] p-4 text-sm text-[#EF4444]">
        {dashboardQuery.error instanceof Error
          ? dashboardQuery.error.message
          : "Unable to load dashboard"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] text-[#1C1917]"
            style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#78716C]" style={{ fontFamily: "Inter" }}>
            Overview of your review monitoring activity
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {trendRangeOptions.map((option) => (
              <Button
                key={option.days}
                variant={trendDays === option.days ? "default" : "outline"}
                size="sm"
                onClick={() => setTrendDays(option.days)}
                className={
                  trendDays === option.days
                    ? "rounded-full bg-[#0D9488] text-white"
                    : "rounded-full"
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BusinessSelect
            businesses={businesses}
            value={effectiveBusinessId}
            onChange={setSelectedBusinessId}
            variant="pill"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshMutation.mutateAsync()}
            disabled={refreshMutation.isPending || !selectedBusiness || !hasPaidPlan}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!businesses?.length && (
        <div className="rounded-lg border border-[#D97706]/40 bg-[#FEF3C7] px-4 py-3 text-sm text-[#1C1917]">
          Add at least one business in Settings to view business-specific dashboard data.
        </div>
      )}

      {!hasPaidPlan && (
        <PaidPlanBanner message="Paid subscription required to sync live reviews. Open Billing and subscribe to unlock dashboard refresh." />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-[#78716C]">Average Rating</p>
              <p className="text-4xl font-bold">{stats.averageRating}</p>
              <div className="flex items-center gap-1 text-sm text-[#10B981]">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {stats.monthlyDelta > 0 ? "+" : ""}
                  {stats.monthlyDelta} from baseline
                </span>
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
              <div className="text-sm text-[#10B981]">
                {stats.weeklyDelta > 0 ? "+" : ""}
                {stats.weeklyDelta} this week
              </div>
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
          <RatingTrendChart trend={data.trend} trendDays={trendDays} />
        </Card>

        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-2">
          <SentimentDonutChart
            chartSentiment={chartSentiment}
            positivePercent={positivePercent}
          />
        </Card>
      </div>

      <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-base text-[#1C1917]"
            style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
          >
            Recent Reviews
          </h3>
          <Button variant="link" className="text-[#0D9488]">
            View all
          </Button>
        </div>
        <div className="space-y-4">
          {data.recentReviews.map((review, index) => (
            <div
              key={review.id}
              className={`flex gap-4 py-4 ${
                index < data.recentReviews.length - 1 ? "border-b border-[#E7E5E4]" : ""
              }`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className="border-0 bg-[#4285F4] text-xs text-white">Google</Badge>
                  <Stars rating={review.rating} />
                  <span className="text-xs text-[#78716C] md:ml-auto">
                    {new Date(review.time).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[#78716C]">{review.text}</p>
              </div>
              <Badge className={`${sentimentColor(review.sentiment)} h-fit border-0`}>
                {review.sentiment}
              </Badge>
            </div>
          ))}
          {data.recentReviews.length === 0 && (
            <p className="text-sm text-[#78716C]">No reviews yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
