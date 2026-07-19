"use client";

import type { CSSProperties, ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardWorkspace } from "@/features/dashboard/hooks/use-dashboard-workspace";
import { dash } from "@/features/dashboard/theme";
import { BusinessSelect } from "@/shared/components/business-select";
import { PaidPlanBanner } from "@/shared/components/paid-plan-banner";
import { cn } from "@/lib/utils";

/**
 * Lazy-load Recharts so stat cards + header paint first (LCP).
 * Chart components share one dynamic chunk.
 */
const chartLoadingFallback = (
  <div
    className="flex h-[240px] items-center justify-center rounded-2xl text-sm"
    style={{ backgroundColor: dash.surfaceMuted, color: dash.textSoft }}
  >
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

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cls}
          style={
            i < Math.round(rating)
              ? { color: dash.star, fill: dash.star }
              : { color: dash.starMuted, fill: dash.starMuted }
          }
        />
      ))}
    </div>
  );
}

function sentimentTone(sentiment: string): CSSProperties {
  if (sentiment === "positive") {
    return {
      backgroundColor: dash.positiveSoft,
      color: dash.positive,
      boxShadow: `inset 0 0 0 1px ${dash.positive}22`,
    };
  }
  if (sentiment === "negative") {
    return {
      backgroundColor: dash.negativeSoft,
      color: dash.negative,
      boxShadow: `inset 0 0 0 1px ${dash.negative}22`,
    };
  }
  return {
    backgroundColor: dash.neutralSoft,
    color: dash.neutral,
    boxShadow: `inset 0 0 0 1px ${dash.neutral}22`,
  };
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const trendRangeOptions = [
  { days: 7 as const, label: "7D" },
  { days: 30 as const, label: "30D" },
  { days: 90 as const, label: "90D" },
];

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  hintColor?: string;
  iconBg: string;
  iconColor: string;
};

function StatCard({
  label,
  value,
  hint,
  icon,
  hintColor = dash.textMuted,
  iconBg,
  iconColor,
}: StatCardProps) {
  return (
    <article
      className="group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderColor: dash.border,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(15,23,42,0.12)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${dash.primary}66, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: dash.textSoft }}
          >
            {label}
          </p>
          <p
            className="text-3xl font-semibold tracking-tight tabular-nums"
            style={{ color: dash.ink }}
          >
            {value}
          </p>
          <p className="text-xs font-medium" style={{ color: hintColor }}>
            {hint}
          </p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

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
      <div
        className="rounded-2xl border px-5 py-4 text-sm"
        style={{
          borderColor: `${dash.negative}33`,
          backgroundColor: dash.negativeSoft,
          color: dash.negative,
        }}
      >
        {dashboardQuery.error instanceof Error
          ? dashboardQuery.error.message
          : "Unable to load dashboard"}
      </div>
    );
  }

  const businessLabel = selectedBusiness?.name ?? "Your business";
  const ratingDisplay =
    stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : "—";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-4">
      {/* ── Page header ── */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{
              borderColor: `${dash.primary}22`,
              backgroundColor: dash.primarySoft,
              color: dash.primaryDeep,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: dash.primary }}
            />
            Overview
          </div>
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight md:text-[2.05rem]"
              style={{ color: dash.ink }}
            >
              Dashboard
            </h1>
            <p
              className="mt-1.5 max-w-xl text-sm leading-relaxed"
              style={{ color: dash.textMuted }}
            >
              Reputation snapshot for{" "}
              <span className="font-medium" style={{ color: dash.ink }}>
                {businessLabel}
              </span>
              {" — "}ratings, sentiment, and issues that need attention.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="inline-flex rounded-full border bg-white p-1 shadow-sm"
            style={{ borderColor: dash.border }}
            role="group"
            aria-label="Trend range"
          >
            {trendRangeOptions.map((option) => {
              const active = trendDays === option.days;
              return (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => setTrendDays(option.days)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                  style={
                    active
                      ? {
                          backgroundColor: dash.primary,
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.28)",
                        }
                      : { color: dash.textMuted }
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <BusinessSelect
            businesses={businesses}
            value={effectiveBusinessId}
            onChange={setSelectedBusinessId}
            variant="pill"
          />

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-white shadow-sm"
            style={{ borderColor: dash.border, color: dash.primary }}
            onClick={() => void refreshMutation.mutateAsync()}
            disabled={
              refreshMutation.isPending || !selectedBusiness || !hasPaidPlan
            }
            title={
              !selectedBusiness
                ? "Add a business first"
                : !hasPaidPlan
                  ? "Paid plan required to sync"
                  : "Refresh reviews from Google"
            }
            aria-label="Refresh reviews"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")}
            />
          </Button>
        </div>
      </header>

      {/* ── Status banners ── */}
      {!businesses?.length && (
        <div
          className="rounded-2xl border px-5 py-4 text-sm"
          style={{
            borderColor: `${dash.neutral}44`,
            backgroundColor: dash.neutralSoft,
            color: dash.text,
          }}
        >
          Add at least one business in{" "}
          <Link
            href="/settings"
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: dash.primaryDeep }}
          >
            Settings
          </Link>{" "}
          to view business-specific dashboard data.
        </div>
      )}

      {!hasPaidPlan && (
        <PaidPlanBanner message="Paid subscription required to sync live reviews. Open Billing and subscribe to unlock dashboard refresh." />
      )}

      {/* ── Hero + stats ── */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white lg:col-span-4"
          style={{
            background: `linear-gradient(145deg, ${dash.ink} 0%, ${dash.inkSoft} 52%, ${dash.primaryDeep} 100%)`,
            boxShadow: "0 24px 48px -20px rgba(15,23,42,0.45)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-2xl"
            style={{ backgroundColor: "rgba(37,99,235,0.35)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-6 h-40 w-40 rounded-full blur-2xl"
            style={{ backgroundColor: "rgba(148,163,184,0.2)" }}
          />

          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Average rating
              </p>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white/90"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                {stats.totalReviews} reviews
              </span>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-6xl font-semibold leading-none tracking-tight tabular-nums">
                {ratingDisplay}
              </span>
              <div className="mb-1.5 space-y-1">
                <Stars rating={stats.averageRating || 0} size="md" />
                <p className="text-xs text-white/60">out of 5.0</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-white/90"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                <TrendingUp className="h-3.5 w-3.5 text-blue-200" />
                {stats.monthlyDelta > 0 ? "+" : ""}
                {stats.monthlyDelta} vs baseline
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-white/90"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                {positivePercent}% positive
              </span>
            </div>

            <p className="text-sm leading-relaxed text-white/70">
              Today&apos;s mix: {sentimentToday}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-2">
          <StatCard
            label="Total reviews"
            value={stats.totalReviews}
            hint={`${stats.weeklyDelta > 0 ? "+" : ""}${stats.weeklyDelta} this week`}
            hintColor={dash.positive}
            iconBg={dash.primarySoft}
            iconColor={dash.primary}
            icon={<MessageCircle className="h-5 w-5" />}
          />
          <StatCard
            label="New today"
            value={stats.newToday}
            hint={sentimentToday}
            hintColor={dash.textMuted}
            iconBg={dash.surfaceHover}
            iconColor={dash.inkSoft}
            icon={<Sparkles className="h-5 w-5" />}
          />
          <StatCard
            label="Active alerts"
            value={stats.activeAlerts}
            hint={stats.activeAlertsText}
            hintColor={stats.activeAlerts > 0 ? dash.negative : dash.positive}
            iconBg={stats.activeAlerts > 0 ? dash.negativeSoft : dash.positiveSoft}
            iconColor={stats.activeAlerts > 0 ? dash.negative : dash.positive}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <StatCard
            label="Avg. rating"
            value={ratingDisplay}
            hint={`${stats.monthlyDelta > 0 ? "+" : ""}${stats.monthlyDelta} from baseline`}
            hintColor={dash.positive}
            iconBg={dash.neutralSoft}
            iconColor={dash.star}
            icon={
              <Star className="h-5 w-5" style={{ color: dash.star, fill: dash.star }} />
            }
          />
        </div>
      </section>

      {/* ── Charts ── */}
      <section className="grid gap-4 xl:grid-cols-5">
        <div
          className="rounded-3xl border bg-white p-5 sm:p-6 xl:col-span-3"
          style={{
            borderColor: dash.border,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -20px rgba(15,23,42,0.12)",
          }}
        >
          <RatingTrendChart trend={data.trend} trendDays={trendDays} />
        </div>
        <div
          className="rounded-3xl border bg-white p-5 sm:p-6 xl:col-span-2"
          style={{
            borderColor: dash.border,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -20px rgba(15,23,42,0.12)",
          }}
        >
          <SentimentDonutChart
            chartSentiment={chartSentiment}
            positivePercent={positivePercent}
          />
        </div>
      </section>

      {/* ── Recent reviews ── */}
      <section
        className="overflow-hidden rounded-3xl border bg-white"
        style={{
          borderColor: dash.border,
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -20px rgba(15,23,42,0.12)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"
          style={{ borderColor: dash.border, backgroundColor: dash.surfaceMuted }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: dash.ink }}>
              Recent reviews
            </h2>
            <p className="text-xs" style={{ color: dash.textSoft }}>
              Latest feedback across your monitored locations
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 hover:bg-transparent"
            style={{ color: dash.primary }}
            asChild
          >
            <Link href="/reviews">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="divide-y" style={{ borderColor: dash.border }}>
          {data.recentReviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-start sm:gap-5 sm:px-6"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = dash.surfaceMuted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${dash.primaryDeep} 0%, ${dash.primaryLight} 100%)`,
                }}
              >
                G
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-0 text-[11px] font-medium hover:bg-transparent"
                    style={{
                      backgroundColor: dash.primarySoft,
                      color: dash.primaryDeep,
                    }}
                  >
                    Google
                  </Badge>
                  <Stars rating={review.rating} />
                  <span className="text-xs" style={{ color: dash.textSoft }}>
                    {relativeTime(review.time)}
                  </span>
                  <span
                    className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                    style={sentimentTone(review.sentiment)}
                  >
                    {review.sentiment}
                  </span>
                </div>
                <p
                  className="line-clamp-3 text-sm leading-relaxed"
                  style={{ color: dash.textMuted }}
                >
                  {review.text}
                </p>
              </div>
            </article>
          ))}

          {data.recentReviews.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: dash.surfaceHover, color: dash.textSoft }}
              >
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium" style={{ color: dash.ink }}>
                No reviews yet
              </p>
              <p className="max-w-sm text-xs" style={{ color: dash.textSoft }}>
                Sync Google reviews from Settings or hit Refresh once a business
                is connected.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
