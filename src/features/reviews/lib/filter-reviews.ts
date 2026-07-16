import type { ReviewFilters, ReviewItem } from "@/features/reviews/types";

export function filterReviews(reviews: ReviewItem[], filters: ReviewFilters): ReviewItem[] {
  const { query, sentiment, source } = filters;

  return reviews.filter((review) => {
    if (
      query &&
      !`${review.author} ${review.text}`.toLowerCase().includes(query.toLowerCase())
    ) {
      return false;
    }

    if (sentiment !== "all" && review.sentiment !== sentiment) {
      const selected = sentiment.toLowerCase();
      if (
        review.sentiment !== selected &&
        !review.tags.map((tag) => tag.toLowerCase()).includes(selected) &&
        review.urgency.toLowerCase() !== selected
      ) {
        return false;
      }
    }

    if (source !== "all" && review.source.toLowerCase() !== source.toLowerCase()) {
      return false;
    }

    return true;
  });
}
