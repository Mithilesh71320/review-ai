"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionList } from "@/features/reviews/components/section-list";
import type { InsightsResponse } from "@/features/reviews/types";

type InsightsQueryLike = {
  isPending: boolean;
  error: Error | null;
  data?: InsightsResponse;
};

type InsightsPanelProps = {
  canUseAdvancedAi: boolean;
  insightsQuery: InsightsQueryLike;
};

export function InsightsPanel({ canUseAdvancedAi, insightsQuery }: InsightsPanelProps) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>AI Improvement Brief</CardTitle>
        <CardDescription>
          Structured summary of what customers appreciate, what hurts trust, and what to fix next.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insightsQuery.isPending && (
          <p className="text-sm text-muted-foreground">Preparing AI summary...</p>
        )}
        {!canUseAdvancedAi && (
          <div className="rounded-lg border border-[#D97706]/40 bg-[#FEF3C7]/30 p-3 text-sm text-foreground">
            Growth or Pro required for advanced AI recommendations.
          </div>
        )}
        {insightsQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {insightsQuery.error instanceof Error
              ? insightsQuery.error.message
              : "Failed to load AI summary."}
          </div>
        )}
        {insightsQuery.data && (
          <div className="grid gap-3">
            <SectionList
              title="What Should Be Improved or Changed"
              items={insightsQuery.data.improvedOrChanged}
            />
            <SectionList
              title="What Should Remain the Same"
              items={insightsQuery.data.remainSame}
            />
            <div className="rounded-2xl border border-border/70 bg-background p-4">
              <p className="text-sm font-medium text-foreground">Recommended Actions</p>
              <div className="mt-3 space-y-3">
                {insightsQuery.data.recommendedActions.map((rec, idx) => (
                  <div
                    key={idx}
                    className="space-y-1.5 rounded-xl border border-border/50 bg-muted/20 p-3"
                  >
                    <div className="flex gap-2 text-sm text-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{rec.action}</span>
                    </div>
                    <p className="ml-3.5 text-xs italic text-muted-foreground">
                      Evidence: {rec.evidence}
                    </p>
                    <div className="ml-3.5 flex gap-2">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        Impact: {rec.impact}
                      </Badge>
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        Effort: {rec.effort}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
