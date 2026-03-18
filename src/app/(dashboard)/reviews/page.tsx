"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type ReviewsResponse = {
  reviews: Array<{
    id: string;
    author: string;
    text: string;
    rating: number;
    sentiment: string;
    source: string;
    createdAt: string;
    canReply: boolean;
    reply: string | null;
    repliedAt: string | null;
  }>;
};

type InsightsResponse = {
  summary: string;
  strengths: string[];
  issues: string[];
  opportunities: string[];
  actionPlan: string[];
  customerTone: "positive" | "mixed" | "negative";
  responseStyle: string;
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

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource] = useState("all");
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const autoSyncedBusinessRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { data: settingsData } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });

  const effectiveBusinessId =
    selectedBusinessId ?? settingsData?.businesses[0]?.id ?? null;
  const selectedBusiness =
    settingsData?.businesses.find((business) => business.id === effectiveBusinessId) ??
    settingsData?.businesses[0];

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.reviews(effectiveBusinessId),
    queryFn: () =>
      fetchJson<ReviewsResponse>(
        `/api/reviews${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const insightsQuery = useQuery({
    queryKey: queryKeys.insights(effectiveBusinessId),
    queryFn: () =>
      fetchJson<InsightsResponse>(
        `/api/insights${effectiveBusinessId ? `?managedBusinessId=${effectiveBusinessId}` : ""}`,
        { cache: "no-store" },
      ),
    enabled: Boolean(effectiveBusinessId),
  });

  const fetchReviewsMutation = useMutation({
    mutationFn: async () => {
      const placeId = selectedBusiness?.placeId?.trim();
      const businessName = selectedBusiness?.name?.trim();

      if (!placeId && !businessName) {
        throw new Error(
          "Add a business name or Google Place ID in Settings before fetching reviews.",
        );
      }

      return fetchJson<{ storedCount: number }>("/api/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBusinessId: effectiveBusinessId,
          placeId,
          businessName,
        }),
      });
    },
    onSuccess: async (payload) => {
      setFetchMessage(
        payload.storedCount > 0
          ? `Synced successfully. ${payload.storedCount} new review(s) stored.`
          : "Synced successfully. No new reviews were stored.",
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights(effectiveBusinessId) }),
      ]);
    },
    onError: (mutationError) => {
      setFetchMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to fetch latest reviews.",
      );
    },
  });

  const replyDraftMutation = useMutation({
    mutationFn: (reviewId: string) =>
      fetchJson<{ reply: string }>("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", reviewId }),
      }),
  });

  const postReplyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      fetchJson<{ ok: true }>("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", reviewId, reply }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews(effectiveBusinessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(effectiveBusinessId) }),
      ]);
    },
  });

  const refreshSelectedBusiness = useCallback(async () => {
    if (selectedBusiness?.placeId?.trim() || selectedBusiness?.name?.trim()) {
      await fetchReviewsMutation.mutateAsync();
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: queryKeys.reviews(effectiveBusinessId),
    });
  }, [
    effectiveBusinessId,
    fetchReviewsMutation,
    queryClient,
    selectedBusiness?.name,
    selectedBusiness?.placeId,
  ]);

  useEffect(() => {
    if (!effectiveBusinessId || !selectedBusiness) {
      autoSyncedBusinessRef.current = null;
      return;
    }

    if (autoSyncedBusinessRef.current === effectiveBusinessId) {
      return;
    }

    autoSyncedBusinessRef.current = effectiveBusinessId;
    void refreshSelectedBusiness();
  }, [effectiveBusinessId, refreshSelectedBusiness, selectedBusiness]);

  const reviews = useMemo(() => {
    const all = data?.reviews ?? [];
    return all.filter((review) => {
      if (
        query &&
        !`${review.author} ${review.text}`.toLowerCase().includes(query.toLowerCase())
      ) {
        return false;
      }
      if (sentiment !== "all" && review.sentiment !== sentiment) {
        return false;
      }
      if (source !== "all" && review.source.toLowerCase() !== source.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [data, query, sentiment, source]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reviews</h1>
        <p className="text-muted-foreground">
          Track live review sentiment, uncover patterns, and respond without leaving the app.
        </p>
      </div>

      {fetchMessage && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
          {fetchMessage}
        </div>
      )}

      <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(16,185,129,0.05),rgba(255,255,255,0.9))] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
              Review Command Center
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Keep response quality high while spotting what customers want fixed.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={effectiveBusinessId ?? "none"}
              onValueChange={(value) => setSelectedBusinessId(value === "none" ? null : value)}
            >
              <SelectTrigger className="w-[240px] bg-background/90">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {settingsData?.businesses.length ? (
                  settingsData.businesses.map((business) => (
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
              className="gap-2 bg-background/90"
              onClick={() => {
                setFetchMessage(null);
                void refreshSelectedBusiness();
              }}
              disabled={fetchReviewsMutation.isPending || !selectedBusiness}
            >
              <RefreshCw className="h-4 w-4" />
              {fetchReviewsMutation.isPending ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-primary/10 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Review Feed</CardTitle>
            <CardDescription>
              Recent reviews for the selected business. Refresh pulls the latest Google reviews and stores only new ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" aria-label="Filter">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {!settingsData?.businesses.length && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                Add at least one business in Settings to fetch and browse reviews.
              </div>
            )}

            {isPending && <div className="text-sm text-muted-foreground">Loading reviews...</div>}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                {error instanceof Error ? error.message : "Failed to load reviews"}
              </div>
            )}

            {!isPending && !error && (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{review.author}</span>
                          <StarRating rating={review.rating} />
                          <SentimentBadge sentiment={review.sentiment} />
                          <Badge variant="outline">{review.source}</Badge>
                          {review.canReply && (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">
                              Reply available
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-6 text-foreground">&ldquo;{review.text}&rdquo;</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                        {review.reply && (
                          <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-success">
                              Posted reply
                            </p>
                            <p className="mt-1 text-sm text-foreground">{review.reply}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex w-full max-w-xs flex-col gap-2">
                        <Button
                          variant="outline"
                          disabled={!review.canReply || replyDraftMutation.isPending || postReplyMutation.isPending}
                          onClick={async () => {
                            const draft = await replyDraftMutation.mutateAsync(review.id);
                            await postReplyMutation.mutateAsync({
                              reviewId: review.id,
                              reply: draft.reply,
                            });
                            setFetchMessage("AI reply drafted and posted to Google.");
                          }}
                        >
                          {replyDraftMutation.isPending || postReplyMutation.isPending
                            ? "Working..."
                            : "Generate & Post"}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={replyDraftMutation.isPending}
                          onClick={async () => {
                            const draft = await replyDraftMutation.mutateAsync(review.id);
                            setFetchMessage(`Draft reply: ${draft.reply}`);
                          }}
                        >
                          Draft AI Reply
                        </Button>
                        {!review.canReply && (
                          <p className="text-xs text-muted-foreground">
                            Posting replies requires Google Business Profile review access.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-sm text-muted-foreground">No reviews available.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>AI Improvement Brief</CardTitle>
            <CardDescription>
              Structured summary of what customers appreciate, what hurts trust, and what to fix next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insightsQuery.isPending && (
              <p className="text-sm text-muted-foreground">Preparing AI summary...</p>
            )}
            {insightsQuery.error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {insightsQuery.error instanceof Error
                  ? insightsQuery.error.message
                  : "Failed to load AI summary."}
              </div>
            )}
            {insightsQuery.data && (
              <>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
                    Executive Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {insightsQuery.data.summary}
                  </p>
                </div>
                <div className="grid gap-3">
                  <SectionList title="What Customers Love" items={insightsQuery.data.strengths} />
                  <SectionList title="What Needs Attention" items={insightsQuery.data.issues} />
                  <SectionList
                    title="Improvement Opportunities"
                    items={insightsQuery.data.opportunities}
                  />
                  <SectionList title="Recommended Actions" items={insightsQuery.data.actionPlan} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
