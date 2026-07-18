import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { buildSixMonthTrend } from "@/server/services/review-monitoring/dashboard.helpers";

/**
 * Kept for modular composition; primary path uses ReviewMonitoringService.getDashboard.
 */
export class DashboardService {
  async getDashboard(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      workspace.managedBusinesses.find((business) => business.id === managedBusinessId) ??
      workspace.managedBusinesses[0];

    const metrics = await reviewMonitoringRepository.getDashboardMetrics(
      workspace.id,
      selectedManagedBusiness?.id,
    );

    const totalSentiment =
      metrics.sentimentCount.POSITIVE +
      metrics.sentimentCount.NEUTRAL +
      metrics.sentimentCount.NEGATIVE;

    return {
      stats: {
        averageRating: Number(metrics.averageRating.toFixed(1)),
        totalReviews: metrics.totalReviews,
        newToday: metrics.newToday,
        activeAlerts: metrics.activeAlerts,
        monthlyDelta: Number((metrics.averageRating - 4.5).toFixed(1)),
        weeklyDelta: metrics.weekDelta,
        sentimentTodayText: `${metrics.sentimentToday.POSITIVE} positive, ${metrics.sentimentToday.NEGATIVE} negative, ${metrics.sentimentToday.NEUTRAL} neutral`,
        activeAlertsText:
          metrics.negativeToday > 0
            ? `${metrics.negativeToday} negative reviews detected today`
            : "No negative reviews detected today",
      },
      trend: buildSixMonthTrend(metrics.trendRows, metrics.now),
      sentiment: [
        {
          name: "Positive",
          value: totalSentiment
            ? Math.round((metrics.sentimentCount.POSITIVE / totalSentiment) * 100)
            : 0,
          color: "hsl(142, 76%, 36%)",
        },
        {
          name: "Neutral",
          value: totalSentiment
            ? Math.round((metrics.sentimentCount.NEUTRAL / totalSentiment) * 100)
            : 0,
          color: "hsl(38, 92%, 50%)",
        },
        {
          name: "Negative",
          value: totalSentiment
            ? Math.round((metrics.sentimentCount.NEGATIVE / totalSentiment) * 100)
            : 0,
          color: "hsl(0, 84%, 60%)",
        },
      ],
      recentReviews: metrics.recentReviews.map((review) => ({
        id: review.id,
        text: review.text,
        rating: review.rating,
        sentiment: review.sentiment.toLowerCase(),
        time: review.createdAt.toISOString(),
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }
}

export const dashboardService = new DashboardService();
