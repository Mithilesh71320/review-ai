import { generateReviewReply } from "@/lib/ai";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { googleService } from "./google.service";

export class ReviewsReplyService {
  async draftReviewReply(
    userId: string,
    access: { capabilities: { aiResponses: boolean } },
    reviewId: string,
  ) {
    if (!access.capabilities.aiResponses) throw new Error("Starter or higher plan required for AI review replies.");

    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const review = await reviewMonitoringRepository.getReviewById(reviewId, workspace.id);

    if (!review) throw new Error("Review not found.");

    return generateReviewReply({
      businessName: review.managedBusiness?.name ?? workspace.name,
      businessContext: workspace.settings?.businessContext ?? "",
      review: {
        author: review.author,
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt.toISOString(),
      },
    });
  }

  async postReviewReply(
    userId: string,
    access: { capabilities: { aiResponses: boolean } },
    reviewId: string,
    replyText: string,
  ) {
    if (!access.capabilities.aiResponses) throw new Error("Starter or higher plan required for AI review replies.");

    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const review = await reviewMonitoringRepository.getReviewById(reviewId, workspace.id);

    if (!review) throw new Error("Review not found.");

    if (!review.reviewResourceName) {
      throw new Error(
        "This review was not fetched from Google Business Profile, so posting a reply is not available.",
      );
    }

    const accessToken = await googleService.getValidGoogleAccessToken(userId);
    if (!accessToken) throw new Error("Google Business account is not connected.");

    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${review.reviewResourceName}/reply`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: replyText.trim() }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string; status?: string } }
        | null;
      const googleMessage = payload?.error?.message?.trim();

      if (response.status === 403 || response.status === 401) {
        throw new Error(
          "You are not the owner or authorized manager of this Google Business Profile. Only the owner/manager can post replies.",
        );
      }

      throw new Error(googleMessage || "Failed to post Google review reply.");
    }

    const repliedAt = new Date();
    await reviewMonitoringRepository.updateReviewReply(review.id, {
      reviewReply: replyText.trim(),
      reviewRepliedAt: repliedAt,
    });

    return { ok: true, repliedAt: repliedAt.toISOString() };
  }
}

export const reviewsReplyService = new ReviewsReplyService();