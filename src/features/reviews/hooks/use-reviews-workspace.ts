"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  draftReviewReply,
  fetchInsights,
  fetchReviews,
  postReviewReply,
} from "@/features/reviews/api";
import { filterReviews } from "@/features/reviews/lib/filter-reviews";
import { queryKeys } from "@/lib/query-keys";
import { useFetchReviewsMutation } from "@/shared/hooks/use-fetch-reviews";
import { useManagedBusinessSelection } from "@/shared/hooks/use-managed-business-selection";
import { useWorkspaceSettingsQuery } from "@/shared/hooks/use-settings-query";

/**
 * All data + mutations for the Reviews page.
 * UI components should only consume this hook — no direct API calls in JSX.
 */
export function useReviewsWorkspace() {
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource] = useState("all");
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const autoSyncedBusinessRef = useRef<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!fetchMessage) return;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setFetchMessage(null), 5000);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [fetchMessage]);

  const settingsQuery = useWorkspaceSettingsQuery();
  const businesses = settingsQuery.data?.businesses;
  const {
    setSelectedBusinessId,
    effectiveBusinessId,
    selectedBusiness,
  } = useManagedBusinessSelection(businesses);

  const hasPaidPlan = settingsQuery.data?.subscription.hasPaidPlan ?? false;
  const canUseAiReplies =
    settingsQuery.data?.subscription.capabilities?.aiResponses ?? false;
  const canUseAdvancedAi =
    settingsQuery.data?.subscription.capabilities?.advancedAiRecommendations ?? false;

  const reviewsQuery = useInfiniteQuery({
    queryKey: queryKeys.reviews(effectiveBusinessId),
    queryFn: ({ pageParam }) =>
      fetchReviews(effectiveBusinessId, { cursor: pageParam, limit: 25 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const insightsQuery = useQuery({
    queryKey: queryKeys.insights(effectiveBusinessId),
    queryFn: () => fetchInsights(effectiveBusinessId),
    enabled: Boolean(effectiveBusinessId && canUseAdvancedAi),
  });

  const fetchReviewsMutation = useFetchReviewsMutation({
    managedBusinessId: effectiveBusinessId,
    selectedBusiness,
    hasPaidPlan,
    onSuccessMessage: (payload) => {
      if (payload.reviewLimitReached) {
        setFetchMessage(
          `Review limit reached. ${payload.storedCount} new review(s) stored${
            payload.reviewLimit ? ` before hitting ${payload.reviewLimit}` : ""
          }.`,
        );
      } else {
        setFetchMessage(
          payload.storedCount > 0
            ? `Synced successfully. ${payload.storedCount} new review(s) stored.`
            : "Synced successfully. No new reviews were stored.",
        );
      }
    },
    onErrorMessage: setFetchMessage,
  });

  const syncReviews = fetchReviewsMutation.mutateAsync;
  const isRefreshing = fetchReviewsMutation.isPending;

  const replyDraftMutation = useMutation({
    mutationFn: draftReviewReply,
    onSuccess: (payload, reviewId) => {
      setDraftReplies((current) => ({ ...current, [reviewId]: payload.reply }));
      setFetchMessage("AI draft ready. Review it, then post or regenerate.");
    },
    onError: (error) => {
      setFetchMessage(
        error instanceof Error ? error.message : "Failed to generate AI reply draft.",
      );
    },
  });

  const regenerateReplyMutation = useMutation({
    mutationFn: draftReviewReply,
    onSuccess: (payload, reviewId) => {
      setDraftReplies((current) => ({ ...current, [reviewId]: payload.reply }));
      setFetchMessage("AI reply regenerated.");
    },
  });

  const postReplyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      postReviewReply(reviewId, reply),
    onSuccess: () => {
      setDraftReplies({});
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reviews(effectiveBusinessId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard(effectiveBusinessId),
      });
      setFetchMessage("Reply posted to Google successfully.");
    },
    onError: (error) => {
      setFetchMessage(
        error instanceof Error ? error.message : "Failed to post review reply.",
      );
    },
  });

  const refreshSelectedBusiness = useCallback(async () => {
    if (!selectedBusiness) {
      setFetchMessage("Add at least one business in Settings before refreshing reviews.");
      return;
    }
    if (!hasPaidPlan) {
      setFetchMessage("Paid subscription required to sync reviews. Open Billing to continue.");
      return;
    }
    if (selectedBusiness.placeId?.trim() || selectedBusiness.name?.trim()) {
      await syncReviews();
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.reviews(effectiveBusinessId),
    });
  }, [effectiveBusinessId, hasPaidPlan, queryClient, selectedBusiness, syncReviews]);

  useEffect(() => {
    if (!effectiveBusinessId || !selectedBusiness || !hasPaidPlan) {
      if (!effectiveBusinessId) autoSyncedBusinessRef.current = null;
      return;
    }
    if (autoSyncedBusinessRef.current === effectiveBusinessId) return;
    autoSyncedBusinessRef.current = effectiveBusinessId;
    void syncReviews().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBusinessId, hasPaidPlan, selectedBusiness?.id]);

  const reviews = useMemo(
    () =>
      filterReviews(
        reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [],
        { query, sentiment, source },
      ),
    [reviewsQuery.data, query, sentiment, source],
  );

  return {
    // selection
    businesses,
    effectiveBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    hasPaidPlan,
    canUseAiReplies,
    canUseAdvancedAi,
    subscription: settingsQuery.data?.subscription,

    // filters
    query,
    setQuery,
    sentiment,
    setSentiment,
    source,
    setSource,

    // data
    reviews,
    reviewsPending: reviewsQuery.isPending,
    reviewsFetchingNextPage: reviewsQuery.isFetchingNextPage,
    hasMoreReviews: reviewsQuery.hasNextPage,
    reviewsError: reviewsQuery.error,
    insightsQuery,
    fetchMessage,
    setFetchMessage,
    draftReplies,

    // actions
    isRefreshing,
    refreshSelectedBusiness,
    loadMoreReviews: reviewsQuery.fetchNextPage,
    replyDraftMutation,
    regenerateReplyMutation,
    postReplyMutation,
  };
}
