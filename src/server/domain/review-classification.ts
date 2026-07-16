import type { AlertSeverity, Sentiment } from "@/generated/prisma/client";

/**
 * Rule-based review tagging used for UI filters + AI insight context.
 * Keep this deterministic and side-effect free.
 */
export function classifyReview(text: string, rating: number) {
  const normalized = text.toLowerCase();
  const tags = new Set<string>();

  if (
    /\b(work|working|broken|issue|integration|feature|menu|order|wrong|missing|quality|taste|ketchup)\b/.test(
      normalized,
    )
  ) {
    tags.add("functional");
  }

  if (
    /\b(slow|fast|lag|crash|delay|wait|waiting|responsive|late|queue|timing)\b/.test(
      normalized,
    )
  ) {
    tags.add("performance");
  }

  if (
    /\b(kind|helpful|friendly|rude|polite|respect|valued|care|attitude|service)\b/.test(
      normalized,
    )
  ) {
    tags.add("emotional_relational");
  }

  if (
    /\b(price|cost|expensive|cheap|billing|refund|discount|deal|value|overpriced)\b/.test(
      normalized,
    )
  ) {
    tags.add("transactional");
  }

  let urgency: "critical_at_risk" | "constructive" | "gratitude";
  const criticalSignal =
    /\b(never again|worst|terrible|awful|unacceptable|frustrated|angry|bad experience|refund now|switching|moving away)\b/.test(
      normalized,
    );
  const positiveOnlySignal =
    /\b(thank|great|amazing|excellent|love|awesome|best|perfect)\b/.test(normalized) &&
    !/\b(but|however|issue|problem|slow|wrong|missing|not)\b/.test(normalized);
  const explicitFixSignal =
    /\b(should|could|please|improve|fix|need|suggest|wish|better)\b/.test(normalized) ||
    tags.has("functional") ||
    tags.has("performance") ||
    tags.has("transactional");

  if (criticalSignal) {
    urgency = "critical_at_risk";
    tags.add("critical_at_risk");
  } else if (positiveOnlySignal) {
    urgency = "gratitude";
    tags.add("gratitude");
  } else if (explicitFixSignal) {
    urgency = "constructive";
    tags.add("constructive");
  } else if (rating <= 2) {
    urgency = "critical_at_risk";
    tags.add("critical_at_risk");
  } else {
    urgency = "constructive";
    tags.add("constructive");
  }

  return {
    tags: [...tags],
    urgency,
  };
}

export function sentimentFromRating(rating: number): Sentiment {
  if (rating <= 2) return "NEGATIVE";
  if (rating === 3) return "NEUTRAL";
  return "POSITIVE";
}

export function severityFromRating(rating: number): AlertSeverity {
  if (rating <= 1) return "HIGH";
  if (rating <= 2) return "MEDIUM";
  return "LOW";
}
