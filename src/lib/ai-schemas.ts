import { z } from "zod";

export const ReviewSentimentSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  reason: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).optional(),
});

export const ReviewInsightsSchema = z.object({
  improvedOrChanged: z.array(z.string().min(1)).min(1).max(5),
  remainSame: z.array(z.string().min(1)).min(1).max(5),
  recommendedActions: z
    .array(
      z.object({
        action: z.string().min(1),
        evidence: z.string().min(1),
        impact: z.enum(["high", "medium", "low"]),
        effort: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(5),
});

export const ReviewReplySchema = z.object({
  reply: z.string().min(10).max(600),
  tone: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ValidatedInsights = z.infer<typeof ReviewInsightsSchema>;
export type ValidatedReply = z.infer<typeof ReviewReplySchema>;
export type ValidatedSentiment = z.infer<typeof ReviewSentimentSchema>;
