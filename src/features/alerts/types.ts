export type AlertsResponse = {
  unreadCount: number;
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    read: boolean;
    createdAt: string;
  }>;
  rules: Array<{
    id: string;
    type: "NEGATIVE_REVIEW" | "RATING_DROP" | "TREND" | "POSITIVE_SPIKE";
    name: string;
    description: string;
    enabled: boolean;
  }>;
  selectedBusinessId?: string | null;
  nextCursor?: string | null;
  hasMore?: boolean;
};
