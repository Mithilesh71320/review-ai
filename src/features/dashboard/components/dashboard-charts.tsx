"use client";

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
import { dash, sentimentColors } from "@/features/dashboard/theme";

type TrendDataPoint = {
  month: string;
  rating: number;
};

type SentimentDataPoint = {
  name: string;
  value: number;
  color: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={{
        borderColor: dash.border,
        backgroundColor: "rgba(255,255,255,0.97)",
      }}
    >
      {label ? (
        <p className="mb-1 font-medium" style={{ color: dash.textSoft }}>
          {label}
        </p>
      ) : null}
      {payload.map((entry, index) => (
        <p key={index} className="font-semibold" style={{ color: dash.text }}>
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || dash.primary }}
          />
          {entry.name ?? "value"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/* ── Rating Trend — Area chart ── */

interface RatingTrendChartProps {
  trend: TrendDataPoint[];
  trendDays: number;
}

export function RatingTrendChart({ trend, trendDays }: RatingTrendChartProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: dash.ink }}>
            Rating trend
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: dash.textSoft }}>
            Average star rating over the last {trendDays} days
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor: dash.primarySoft,
            color: dash.primaryDeep,
            boxShadow: `inset 0 0 0 1px ${dash.primary}22`,
          }}
        >
          {trendDays}d window
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="ratingGradientUniversal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dash.primary} stopOpacity={0.28} />
              <stop offset="55%" stopColor={dash.primary} stopOpacity={0.06} />
              <stop offset="100%" stopColor={dash.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke={dash.border} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: dash.textSoft }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            domain={[0, 5]}
            tick={{ fontSize: 11, fill: dash.textSoft }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 1, 2, 3, 4, 5]}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="rating"
            name="Rating"
            stroke={dash.primaryDeep}
            strokeWidth={2.5}
            fill="url(#ratingGradientUniversal)"
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: "#fff",
              fill: dash.primary,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Sentiment Breakdown — Donut chart ── */

interface SentimentDonutChartProps {
  chartSentiment: SentimentDataPoint[];
  positivePercent: number;
}

export function SentimentDonutChart({
  chartSentiment,
  positivePercent,
}: SentimentDonutChartProps) {
  const colored = chartSentiment.map((item) => ({
    ...item,
    color:
      sentimentColors[item.name as keyof typeof sentimentColors] ||
      (item.color && !item.color.startsWith("hsl") ? item.color : dash.primary),
  }));

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: dash.ink }}>
          Sentiment mix
        </h3>
        <p className="mt-0.5 text-xs" style={{ color: dash.textSoft }}>
          Share of positive, neutral, and negative reviews
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative">
          <PieChart width={168} height={168}>
            <Pie
              data={colored}
              cx={84}
              cy={84}
              innerRadius={54}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {colored.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-semibold tracking-tight tabular-nums"
              style={{ color: dash.ink }}
            >
              {positivePercent}%
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: dash.textSoft }}
            >
              positive
            </span>
          </div>
        </div>

        <div className="w-full space-y-2.5">
          {colored.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ backgroundColor: dash.surfaceMuted }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm" style={{ color: dash.textMuted }}>
                  {item.name}
                </span>
              </div>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: dash.ink }}
              >
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
