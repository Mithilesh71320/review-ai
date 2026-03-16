"use client";

import { useMemo, useState } from "react";
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
import { Star, Search, Filter } from "lucide-react";
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
  }>;
};

type SettingsResponse = {
  business: {
    name: string;
    placeId: string;
  };
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

export default function ReviewsPage() {
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource] = useState("all");
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.reviews,
    queryFn: () => fetchJson<ReviewsResponse>("/api/reviews", { cache: "no-store" }),
  });

  const { data: settingsData } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });

  const fetchReviewsMutation = useMutation({
    mutationFn: async () => {
      if (!settingsData?.business.placeId) {
        throw new Error("Add a Google Place ID in Settings before fetching reviews.");
      }

      return fetchJson<{ storedCount: number }>("/api/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: settingsData.business.placeId,
          businessName: settingsData.business.name,
        }),
      });
    },
    onSuccess: async (payload) => {
      setFetchMessage(
        payload.storedCount > 0
          ? `Fetched reviews successfully. ${payload.storedCount} new review(s) stored.`
          : "Fetched reviews successfully. No new reviews were stored.",
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
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
        <p className="text-muted-foreground">Browse and manage all customer reviews.</p>
      </div>

      {fetchMessage && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
          {fetchMessage}
        </div>
      )}

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
        <Button
          onClick={() => {
            setFetchMessage(null);
            void fetchReviewsMutation.mutateAsync();
          }}
          disabled={fetchReviewsMutation.isPending || !settingsData?.business.placeId}
        >
          {fetchReviewsMutation.isPending ? "Fetching..." : "Fetch Latest Reviews"}
        </Button>
      </div>

      {!settingsData?.business.placeId && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Configure a Google Place ID in Settings to fetch live reviews.
        </div>
      )}

      {isPending && <div className="text-sm text-muted-foreground">Loading reviews...</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load reviews"}
        </div>
      )}

      {!isPending && !error && (
        <Card>
          <CardHeader>
            <CardTitle>All Reviews</CardTitle>
            <CardDescription>{reviews.length} reviews found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{review.author}</span>
                      <StarRating rating={review.rating} />
                      <SentimentBadge sentiment={review.sentiment} />
                      <Badge variant="outline">{review.source}</Badge>
                    </div>
                    <p className="text-sm text-foreground">&ldquo;{review.text}&rdquo;</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">No reviews available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
