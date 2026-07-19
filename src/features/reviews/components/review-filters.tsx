"use client";

import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReviewFiltersProps = {
  query: string;
  onQueryChange: (value: string) => void;
  sentiment: string;
  onSentimentChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
};

export function ReviewFiltersBar({
  query,
  onQueryChange,
  sentiment,
  onSentimentChange,
  source,
  onSourceChange,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          className="pl-9"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <Select value={sentiment} onValueChange={onSentimentChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sentiment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="positive">Positive</SelectItem>
          <SelectItem value="neutral">Neutral</SelectItem>
          <SelectItem value="negative">Negative</SelectItem>
          <SelectItem value="functional">Functional</SelectItem>
          <SelectItem value="performance">Performance</SelectItem>
          <SelectItem value="emotional_relational">Emotional</SelectItem>
          <SelectItem value="transactional">Transactional</SelectItem>
          <SelectItem value="critical_at_risk">Critical</SelectItem>
          <SelectItem value="constructive">Constructive</SelectItem>
          <SelectItem value="gratitude">Gratitude</SelectItem>
        </SelectContent>
      </Select>
      <Select value={source} onValueChange={onSourceChange}>
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
  );
}
