"use client";

import { RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPageSkeleton } from "@/components/dashboard-skeletons";
import { Button } from "@/components/ui/button";
import { InsightsPanel } from "@/features/reviews/components/insights-panel";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { ReviewFiltersBar } from "@/features/reviews/components/review-filters";
import { useReviewsWorkspace } from "@/features/reviews/hooks/use-reviews-workspace";
import { BusinessSelect } from "@/shared/components/business-select";
import { PaidPlanBanner } from "@/shared/components/paid-plan-banner";

export function ReviewsView() {
  const workspace = useReviewsWorkspace();

  if (workspace.reviewsPending && !workspace.reviews.length) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reviews</h1>
        <p className="text-muted-foreground">
          Track live review sentiment, uncover patterns, and respond without leaving the app.
        </p>
      </div>

      {workspace.fetchMessage && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
          {workspace.fetchMessage}
        </div>
      )}

      <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(16,185,129,0.05),rgba(255,255,255,0.9))] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
              Review Command Center
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Keep response quality high while spotting what customers want fixed.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <BusinessSelect
              businesses={workspace.businesses}
              value={workspace.effectiveBusinessId}
              onChange={workspace.setSelectedBusinessId}
            />
            <Button
              variant="outline"
              className="gap-2 bg-background/90"
              onClick={() => {
                workspace.setFetchMessage(null);
                void workspace.refreshSelectedBusiness().catch(() => undefined);
              }}
              disabled={workspace.isRefreshing || !workspace.selectedBusiness}
              title={
                !workspace.selectedBusiness
                  ? "Add a business in Settings first"
                  : !workspace.hasPaidPlan
                    ? "Paid plan required to sync reviews"
                    : "Pull latest Google reviews"
              }
            >
              <RefreshCw
                className={`h-4 w-4 ${workspace.isRefreshing ? "animate-spin" : ""}`}
              />
              {workspace.isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-primary/10 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Review Feed</CardTitle>
            <CardDescription>
              Recent reviews for the selected business. Refresh pulls the latest Google reviews
              and stores only new ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReviewFiltersBar
              query={workspace.query}
              onQueryChange={workspace.setQuery}
              sentiment={workspace.sentiment}
              onSentimentChange={workspace.setSentiment}
              source={workspace.source}
              onSourceChange={workspace.setSource}
            />

            {!workspace.businesses?.length && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                Add at least one business in Settings to fetch and browse reviews.
              </div>
            )}

            {!workspace.hasPaidPlan && <PaidPlanBanner />}

            {workspace.hasPaidPlan && workspace.subscription && (
              <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {workspace.subscription.planName} plan usage:{" "}
                {workspace.subscription.usage?.storedReviews ?? 0}
                {workspace.subscription.limits?.maxStoredReviews == null
                  ? " / Unlimited reviews stored"
                  : ` / ${workspace.subscription.limits.maxStoredReviews} reviews stored`}
              </div>
            )}

            {workspace.reviewsPending && (
              <div className="text-sm text-muted-foreground">Loading reviews...</div>
            )}
            {workspace.reviewsError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                {workspace.reviewsError instanceof Error
                  ? workspace.reviewsError.message
                  : "Failed to load reviews"}
              </div>
            )}

            {!workspace.reviewsPending && !workspace.reviewsError && (
              <div className="space-y-4">
                {workspace.reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    draftReply={workspace.draftReplies[review.id]}
                    canUseAiReplies={workspace.canUseAiReplies}
                    isDrafting={workspace.replyDraftMutation.isPending}
                    isPosting={workspace.postReplyMutation.isPending}
                    isRegenerating={workspace.regenerateReplyMutation.isPending}
                    onDraft={(id) => void workspace.replyDraftMutation.mutateAsync(id)}
                    onPost={(id, reply) =>
                      void workspace.postReplyMutation.mutateAsync({ reviewId: id, reply })
                    }
                    onRegenerate={(id) =>
                      void workspace.regenerateReplyMutation.mutateAsync(id)
                    }
                  />
                ))}
                {workspace.reviews.length === 0 && (
                  <p className="text-sm text-muted-foreground">No reviews available.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <InsightsPanel
          canUseAdvancedAi={workspace.canUseAdvancedAi}
          insightsQuery={workspace.insightsQuery}
        />
      </div>
    </div>
  );
}
