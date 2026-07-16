"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SentimentBadge } from "@/features/reviews/components/sentiment-badge";
import { StarRating } from "@/features/reviews/components/star-rating";
import type { ReviewItem } from "@/features/reviews/types";

type ReviewCardProps = {
  review: ReviewItem;
  draftReply?: string;
  canUseAiReplies: boolean;
  isDrafting: boolean;
  isPosting: boolean;
  isRegenerating: boolean;
  onDraft: (reviewId: string) => void;
  onPost: (reviewId: string, reply: string) => void;
  onRegenerate: (reviewId: string) => void;
};

export function ReviewCard({
  review,
  draftReply,
  canUseAiReplies,
  isDrafting,
  isPosting,
  isRegenerating,
  onDraft,
  onPost,
  onRegenerate,
}: ReviewCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{review.author}</span>
            <StarRating rating={review.rating} />
            <SentimentBadge sentiment={review.sentiment} />
            <Badge variant="secondary">{review.urgency.replaceAll("_", " ")}</Badge>
            <Badge variant="outline">{review.source}</Badge>
            {review.tags.map((tag) => (
              <Badge key={`${review.id}-${tag}`} variant="outline">
                {tag.replaceAll("_", " ")}
              </Badge>
            ))}
            {review.canReply && (
              <Badge className="bg-success/15 text-success hover:bg-success/15">
                Reply available
              </Badge>
            )}
          </div>
          <p className="text-sm leading-6 text-foreground">&ldquo;{review.text}&rdquo;</p>
          <p className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleString()}
          </p>
          {review.reply && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-success">
                Posted reply
              </p>
              <p className="mt-1 text-sm text-foreground">{review.reply}</p>
            </div>
          )}
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          {!draftReply ? (
            <Button
              variant="outline"
              disabled={!review.canReply || isDrafting || !canUseAiReplies}
              onClick={() => onDraft(review.id)}
            >
              {isDrafting ? "Generating..." : "Generate AI Reply"}
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                className="bg-[#0D9488] text-white hover:bg-[#134E4A]"
                disabled={isPosting || !canUseAiReplies}
                onClick={() => onPost(review.id, draftReply)}
              >
                {isPosting ? "Posting..." : "Post Reply"}
              </Button>
              <Button
                variant="secondary"
                disabled={isRegenerating || !canUseAiReplies}
                onClick={() => onRegenerate(review.id)}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Only the business owner/manager can post replies.
              </p>
            </>
          )}
          {!review.canReply && (
            <p className="text-xs text-muted-foreground">
              Posting replies requires Google Business Profile review access.
            </p>
          )}
        </div>
      </div>

      {draftReply && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            AI Draft Reply
          </p>
          <p className="mt-1 text-sm text-foreground">{draftReply}</p>
        </div>
      )}
    </div>
  );
}
