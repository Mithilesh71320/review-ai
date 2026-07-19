export type DashboardResponse = {
  stats: {
    averageRating: number;
    totalReviews: number;
    newToday: number;
    activeAlerts: number;
    monthlyDelta: number;
    weeklyDelta: number;
    sentimentTodayText: string;
    activeAlertsText: string;
  };
  trend: Array<{ month: string; rating: number }>;
  trendDays: 7 | 30 | 90;
  sentiment: Array<{ name: string; value: number; color: string }>;
  recentReviews: Array<{
    id: string;
    text: string;
    rating: number;
    sentiment: string;
    time: string;
  }>;
};
