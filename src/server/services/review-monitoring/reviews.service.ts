import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { classifyReview, prettyEnum } from "@/server/domain/review-classification";

const REVIEWS_PAGE_LIMIT = 200;

export class ReviewsService {
  async getReviews(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );
    const reviews = await reviewMonitoringRepository.listReviews(
      workspace.id,
      selectedManagedBusiness?.id,
      { take: REVIEWS_PAGE_LIMIT, selectLight: true },
    );

    return {
      reviews: reviews.map((review) => ({
        ...classifyReview(review.text, review.rating),
        id: review.id,
        author: review.author,
        text: review.text,
        rating: review.rating,
        sentiment: review.sentiment.toLowerCase(),
        source: prettyEnum(review.source),
        createdAt: review.createdAt.toISOString(),
        canReply: Boolean(review.reviewResourceName),
        reply: review.reviewReply,
        repliedAt: review.reviewRepliedAt?.toISOString() ?? null,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }
}

export const reviewsService = new ReviewsService();
