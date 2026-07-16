import { fetchJson } from "@/lib/api";
import type { InsightsResponse, ReviewsResponse } from "@/features/reviews/types";

function withBusiness(path: string, managedBusinessId: string | null) {
  return managedBusinessId
    ? `${path}?managedBusinessId=${managedBusinessId}`
    : path;
}

export function fetchReviews(managedBusinessId: string | null) {
  return fetchJson<ReviewsResponse>(withBusiness("/api/reviews", managedBusinessId), {
    cache: "no-store",
  });
}

export function fetchInsights(managedBusinessId: string | null) {
  return fetchJson<InsightsResponse>(withBusiness("/api/insights", managedBusinessId), {
    cache: "no-store",
  });
}

export function draftReviewReply(reviewId: string) {
  return fetchJson<{ reply: string; tone?: string; confidence?: "high" | "medium" | "low" }>(
    "/api/reviews/reply",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draft", reviewId }),
    },
  );
}

export function postReviewReply(reviewId: string, reply: string) {
  return fetchJson<{ ok: true }>("/api/reviews/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "post", reviewId, reply }),
  });
}
