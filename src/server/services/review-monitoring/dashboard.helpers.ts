import type { Sentiment } from "@prisma/client";
import type { Review } from "@prisma/client";

export function buildSixMonthTrend(
  reviews: Array<{ rating: number; createdAt: Date }>,
  fromDate: Date,
): Array<{ month: string; rating: number }> {
  const months: Array<{ key: string; label: string }> = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleString("en-US", { month: "short" });
    months.push({ key, label });
  }

  return months.map(({ key, label }) => {
    const monthReviews = reviews.filter((review) => {
      const reviewKey = `${review.createdAt.getFullYear()}-${review.createdAt.getMonth()}`;
      return reviewKey === key;
    });

    const rating =
      monthReviews.length === 0
        ? 0
        : monthReviews.reduce((sum, review) => sum + review.rating, 0) / monthReviews.length;

    return { month: label, rating: Number(rating.toFixed(1)) };
  });
}

export function buildSentimentText(
  reviews: Array<{ sentiment: Sentiment; createdAt: Date }>,
  fromDate: Date,
): string {
  const dayReviews = reviews.filter((review) => review.createdAt >= fromDate);
  const positive = dayReviews.filter((r) => r.sentiment === "POSITIVE").length;
  const neutral = dayReviews.filter((r) => r.sentiment === "NEUTRAL").length;
  const negative = dayReviews.filter((r) => r.sentiment === "NEGATIVE").length;
  return `${positive} positive, ${negative} negative, ${neutral} neutral`;
}