import { generateReviewInsights } from "@/lib/ai";
import { classifyReview } from "@/server/domain/review-classification";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { assertAdvancedAi, type SubscriptionAccess } from "@/lib/billing-access";

export class InsightsService {
  async getReviewInsights(
    userId: string,
    access: SubscriptionAccess,
    managedBusinessId?: string,
  ) {
    assertAdvancedAi(access);

    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );

    // Only fetch the 20 reviews AI needs — never the full table.
    const reviews = await reviewMonitoringRepository.listReviews(
      workspace.id,
      selectedManagedBusiness?.id,
      { take: 20, selectLight: true },
    );

    if (reviews.length === 0) throw new Error("No reviews available for AI analysis.");

    return generateReviewInsights({
      businessName: selectedManagedBusiness?.name ?? workspace.name,
      businessContext: workspace.settings?.businessContext ?? "",
      reviews: reviews.map((review) => {
        const classified = classifyReview(review.text, review.rating);
        return {
          author: review.author,
          rating: review.rating,
          text: review.text,
          tags: classified.tags,
          createdAt: review.createdAt.toISOString(),
        };
      }),
    });
  }
}

export const insightsService = new InsightsService();