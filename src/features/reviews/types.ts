export type ReviewItem = {
  id: string;
  author: string;
  text: string;
  rating: number;
  sentiment: string;
  tags: string[];
  urgency: "critical_at_risk" | "constructive" | "gratitude";
  source: string;
  createdAt: string;
  canReply: boolean;
  reply: string | null;
  repliedAt: string | null;
};

export type ReviewsResponse = {
  reviews: ReviewItem[];
  selectedBusinessId?: string | null;
};

export type InsightsResponse = {
  improvedOrChanged: string[];
  remainSame: string[];
  recommendedActions: Array<{
    action: string;
    evidence: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }>;
};

export type ReviewFilters = {
  query: string;
  sentiment: string;
  source: string;
};
