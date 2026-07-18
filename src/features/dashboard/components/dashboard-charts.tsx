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

type TrendDataPoint = {
  month: string;
  rating: number;
};

type SentimentDataPoint = {
  name: string;
  value: number;
  color: string;
};

/* ── Rating Trend — Area chart ── */

interface RatingTrendChartProps {
  trend: TrendDataPoint[];
  trendDays: number;
}

export function RatingTrendChart({ trend, trendDays }: RatingTrendChartProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-base text-[#1C1917]"
          style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
        >
          Rating Trend
        </h3>
        <p className="text-xs text-[#78716C]">
          Your average rating over the last {trendDays} days
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={trend}>
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
          <Area
            type="monotone"
            dataKey="rating"
            stroke="#0D9488"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRating)"
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
  return (
    <div className="space-y-4">
      <h3
        className="text-base text-[#1C1917]"
        style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
      >
        Sentiment Breakdown
      </h3>
      <div className="flex flex-col items-center">
        <div className="relative">
          <PieChart width={140} height={140}>
            <Pie
              data={chartSentiment}
              cx={70}
              cy={70}
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartSentiment.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {positivePercent}%
          </div>
        </div>
        <div className="mt-4 w-full space-y-2">
          {chartSentiment.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-[#78716C]">{item.name}</span>
              </div>
              <span className="text-sm">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
