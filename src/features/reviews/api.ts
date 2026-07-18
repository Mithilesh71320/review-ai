import { fetchJson } from "@/lib/api";
import type { InsightsResponse, ReviewsResponse } from "@/features/reviews/types";

function withParams(
  path: string,
  params: Record<string, string | number | null | undefined>,
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function fetchReviews(
  managedBusinessId: string | null,
  options?: { cursor?: string | null; limit?: number },
) {
  return fetchJson<ReviewsResponse>(
    withParams("/api/reviews", {
      managedBusinessId,
      cursor: options?.cursor,
      limit: options?.limit,
    }),
    { cache: "no-store" },
  );
}

export function fetchInsights(managedBusinessId: string | null) {
  return fetchJson<InsightsResponse>(
    withParams("/api/insights", { managedBusinessId }),
    { cache: "no-store" },
  );
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
