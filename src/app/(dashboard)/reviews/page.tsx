"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load reviews");
        }
        const payload = (await res.json()) as ReviewsResponse;
        setData(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load reviews";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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

      {loading && <div className="text-sm text-muted-foreground">Loading reviews...</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
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
