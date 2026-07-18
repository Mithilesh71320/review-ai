import { z } from "zod";

const ReviewSentimentSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  reason: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).optional(),
});

const ReviewInsightsSchema = z.object({
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

const ReviewReplySchema = z.object({
  reply: z.string().min(10).max(600),
  tone: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

export type InsightInput = {
  businessName: string;
  businessContext?: string;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    tags?: string[];
    createdAt: string;
  }>;
};

export type ReplyInput = {
  businessName: string;
  businessContext?: string;
  review: {
    author: string;
    rating: number;
    text: string;
    createdAt: string;
  };
};

export type ReviewInsights = {
  improvedOrChanged: string[];
  remainSame: string[];
  recommendedActions: Array<{
    action: string;
    evidence: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }>;
};

export type ReviewReplyDraft = {
  reply: string;
  tone: string;
  confidence: "high" | "medium" | "low";
};

export type ReviewSentimentClassification = {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  reason: string;
  confidence?: number;
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "have",
  "from",
  "they",
  "them",
  "were",
  "been",
  "very",
  "just",
  "into",
  "your",
  "their",
  "about",
  "there",
  "what",
  "when",
  "where",
  "which",
  "will",
  "would",
  "could",
  "should",
  "because",
  "after",
  "before",
  "while",
  "also",
  "than",
  "then",
  "some",
  "more",
  "most",
  "much",
  "many",
  "really",
  "only",
  "been",
  "being",
  "over",
  "under",
  "again",
  "here",
  "there",
  "nice",
  "good",
  "great",
  "bad",
  "place",
  "business",
]);

function summarizeRatings(ratings: number[]) {
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function snippet(text: string, limit = 96) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function topTerms(texts: string[], limit = 4) {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !stopWords.has(word));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function fallbackInsights(input: InsightInput): ReviewInsights {
  const ratings = input.reviews.map((r) => r.rating);
  summarizeRatings(ratings);
  const negativeReviews = input.reviews.filter((r) => r.rating <= 2);
  const neutralReviews = input.reviews.filter((r) => r.rating === 3);
  const positiveReviews = input.reviews.filter((r) => r.rating >= 4);
  const positiveTerms = topTerms(positiveReviews.map((r) => r.text));
  const negativeTerms = topTerms(negativeReviews.map((r) => r.text));
  const totalReviews = input.reviews.length;

  const hasAnyTerm = (terms: string[], candidates: string[]) =>
    terms.some((term) => candidates.some((candidate) => term.includes(candidate)));

  const packingTheme = hasAnyTerm(negativeTerms, ["pack", "order", "missing", "dispatch", "delivery"]);
  const hygieneTheme = hasAnyTerm(negativeTerms, ["hygiene", "clean", "dirty", "sanit", "smell"]);
  const delayTheme = hasAnyTerm(negativeTerms, ["wait", "slow", "delay", "late", "queue", "response", "call"]);

  const remainSame = positiveTerms.length < 2
    ? [
        positiveTerms[0]
          ? `${positiveTerms[0]} appears as the clearest positive signal; preserve it with documented SOP and weekly quality checks.`
          : "Positive signals are limited in this review set — focus on resolving complaints before reinforcing strengths.",
      ]
    : [
        `${positiveTerms.slice(0, 2).join(" and ")} are recurring strengths in positive feedback and should be preserved through documented service standards.`,
        `Maintain the current execution quality around ${positiveTerms.slice(0, 2).join(" and ")} with periodic quality audits to avoid drift.`,
      ];

  const improvedOrChanged = [
    packingTheme
      ? "Order accuracy and packing workflow has recurring control gaps that are creating repeat customer dissatisfaction."
      : hygieneTheme
        ? "Hygiene and cleanliness standards appear inconsistent and require stricter operational enforcement."
        : delayTheme
          ? "Service/response-time control is inconsistent and needs a stronger SLA with escalation ownership."
          : negativeTerms[0]
            ? `Operational reliability issues are recurring around ${negativeTerms.slice(0, 2).join(" and ")} and require process redesign.`
            : "No single dominant complaint theme is confirmed yet, but early signals show service consistency gaps that need preventive controls.",
    negativeTerms[0]
      ? `Complaint patterns indicate repeat failures in ${negativeTerms.slice(0, 3).join(", ")}, suggesting systemic process issues rather than one-off incidents.`
      : neutralReviews[0]
        ? "Neutral feedback indicates inconsistent execution across shifts, pointing to weak SOP adherence."
        : "Low complaint volume still warrants proactive monitoring to prevent repeat issues from scaling.",
    negativeTerms[0]
      ? `Recurring issues around ${negativeTerms.slice(0, 2).join(" and ")} suggest a process-level failure that needs internal review and corrective SOP.`
      : "Complaint patterns are not yet clear enough to identify a dominant failure — monitor next 10 reviews for emerging themes.",
  ];

  const recommendedActions: ReviewInsights["recommendedActions"] = [];
  const distinctThemes = new Set<string>();

  if (packingTheme) distinctThemes.add("packing");
  if (hygieneTheme) distinctThemes.add("hygiene");
  if (delayTheme) distinctThemes.add("delay");
  if (!packingTheme && !hygieneTheme && !delayTheme && negativeTerms.length > 0) distinctThemes.add("general");

  if (distinctThemes.has("packing")) {
    recommendedActions.push({
      action: "Implement a double-check dispatch checklist before every order handoff | Owner: Shift supervisor | Cadence: Every order | KPI: Order accuracy rate above 98%",
      evidence: `Recurring packing/order issues found in ${negativeReviews.length} negative review(s).`,
      impact: "high",
      effort: "low",
    });
  }
  if (distinctThemes.has("hygiene")) {
    recommendedActions.push({
      action: "Introduce shift-based hygiene checklist with supervisor sign-off | Owner: Floor manager | Cadence: Every shift | KPI: Zero hygiene complaints per month",
      evidence: `Hygiene/cleanliness complaints detected in negative feedback.`,
      impact: "high",
      effort: "medium",
    });
  }
  if (distinctThemes.has("delay")) {
    recommendedActions.push({
      action: "Set a maximum response/service time SLA and assign an escalation owner for breaches | Owner: Operations lead | Cadence: Daily monitoring | KPI: Average service time under target threshold",
      evidence: `Delay/wait-time complaints found in negative reviews.`,
      impact: "high",
      effort: "medium",
    });
  }
  if (distinctThemes.has("general")) {
    recommendedActions.push({
      action: `Run a root-cause review for recurring issues around ${negativeTerms.slice(0, 2).join(" and ")} and publish corrective SOP updates | Owner: Operations lead | Cadence: Weekly review cycle | KPI: 30% drop in repeat complaints within 30 days`,
      evidence: `Terms "${negativeTerms.slice(0, 2).join('", "')}" appear repeatedly in ${negativeReviews.length} negative review(s).`,
      impact: "medium",
      effort: "medium",
    });
  }

  return { improvedOrChanged, remainSame, recommendedActions };
}

function getProvider() {
  const forcedProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (forcedProvider === "openai" && process.env.OPENAI_API_KEY) return "openai" as const;
  if (forcedProvider === "gemini" && process.env.GEMINI_API_KEY) return "gemini" as const;
  if (process.env.OPENAI_API_KEY) return "openai" as const;
  if (process.env.GEMINI_API_KEY) return "gemini" as const;

  throw new Error("Missing AI provider configuration. Set GEMINI_API_KEY or OPENAI_API_KEY.");
}

function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; status?: string } }
      | null;
    throw new Error(payload?.error?.message || "Gemini request failed.");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || "OpenAI request failed.");
  }

  const payload = (await response.json()) as { output_text?: string };
  return payload.output_text ?? "";
}

async function runModel(prompt: string) {
  const provider = getProvider();
  return provider === "openai" ? callOpenAI(prompt) : callGemini(prompt);
}

function fallbackReviewSentiment(text: string): ReviewSentimentClassification {
  const normalized = text.toLowerCase();
  const negativeSignals = [
    "never again",
    "worst",
    "terrible",
    "awful",
    "unacceptable",
    "frustrated",
    "angry",
    "not acceptable",
    "disappointing",
    "missing",
    "wrong order",
    "poor",
    "bad experience",
    "issue",
    "problem",
    "complaint",
  ];
  const positiveSignals = [
    "thank",
    "great",
    "amazing",
    "excellent",
    "love",
    "awesome",
    "perfect",
    "good food",
    "helpful",
    "friendly",
  ];

  const negativeHits = negativeSignals.filter((phrase) => normalized.includes(phrase)).length;
  const positiveHits = positiveSignals.filter((phrase) => normalized.includes(phrase)).length;

  if (negativeHits > positiveHits) {
    return {
      sentiment: "NEGATIVE",
      reason: "Review text includes repeated complaint language and dissatisfaction signals.",
    };
  }
  if (positiveHits > negativeHits) {
    return {
      sentiment: "POSITIVE",
      reason: "Review text is mostly praise without dominant complaint signals.",
    };
  }
  return {
    sentiment: "NEUTRAL",
    reason: "Review text includes mixed or limited sentiment signals.",
  };
}

export async function classifyReviewSentimentFromText(input: {
  reviewText: string;
  rating?: number;
  businessName?: string;
}): Promise<ReviewSentimentClassification> {
  const prompt = `
You are classifying customer review sentiment for business intelligence.

Return strict JSON:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "reason": "string (under 25 words)",
  "confidence": number between 0 and 1
}

Rules:
- Classify by review TEXT meaning first.
- Do not use star rating as primary signal.
- Star rating is secondary context only.
- If review contains concrete dissatisfaction or repeated failure, output NEGATIVE even with 4-5 stars.
- If review has both praise and complaints, prioritize the dominant customer outcome and explain briefly.
- Keep reason under 25 words.
- confidence: 0.9+ if text is clearly one sentiment, 0.5-0.8 if mixed signals.

Business:
${input.businessName?.trim() || "Unknown business"}

Star rating context:
${typeof input.rating === "number" ? String(input.rating) : "not provided"}

Review text:
${input.reviewText}
`.trim();

  try {
    const raw = await runModel(prompt);
    const parsed = extractJson<unknown>(raw);
    const validated = ReviewSentimentSchema.safeParse(parsed);
    if (!validated.success) return fallbackReviewSentiment(input.reviewText);
    return validated.data;
  } catch {
    return fallbackReviewSentiment(input.reviewText);
  }
}

export async function generateReviewInsights(input: InsightInput): Promise<ReviewInsights> {
  const prompt = `
You are a senior customer-experience strategist helping a local business improve review performance.

Analyze the reviews below for "${input.businessName}".
Return strict JSON with this shape:
{
  "improvedOrChanged": ["string"],
  "remainSame": ["string"],
  "recommendedActions": [
    {
      "action": "string - specific action with Owner, Cadence, KPI",
      "evidence": "string - exact review evidence supporting this action",
      "impact": "high" | "medium" | "low",
      "effort": "high" | "medium" | "low"
    }
  ]
}

Requirements:
- Be concrete, commercially useful, and easy to scan.
- Identify repeat themes, operational issues, staff/service issues, product issues, and reputation risks.
- Mention what the business should stop, start, and improve.
- Do not mention that you are an AI.
- Each array should contain 2 to 5 concise bullets.
- Use only evidence grounded in the reviews provided.
- Refer to exact review details, wording, or patterns from this specific business.
- Avoid generic statements that could apply to any business.
- If a theme appears only once, say it is a single-instance signal rather than a repeated pattern.
- Focus on improvement and growth actions, not generic sentiment commentary.
- Never invent business facts, products, staff names, or operational details.
- If the evidence is thin, explicitly say there is not enough evidence instead of guessing.
- Read each review fully; do not infer from star rating alone.
- Never use star rating as the primary signal for tags or urgency.
- Use text evidence first; stars are secondary context only.
- A 5-star review can still contain an operational issue; capture it in tags/issues.
- Use the review tags provided to identify patterns across reviews.
- Reviews with tags like "functional" or "performance" indicate specific operational gaps.
- Reviews tagged "critical_at_risk" need immediate attention in recommendedActions.
- improvedOrChanged: what should be improved or changed.
- For improvedOrChanged: do NOT quote or paraphrase review text. Instead extract the underlying operational or service failure.
- NEVER write a bullet that is just a count of negative/neutral reviews.
- remainSame: what should remain the same because it is working.
- For remainSame: do NOT quote review text. Synthesize the pattern across multiple reviews into a business strength statement.
- Each bullet in remainSame must describe a DISTINCT strength or pattern.
- If fewer than 2 distinct positive themes are present, reduce remainSame to 1-2 bullets.
- recommendedActions: prioritized actions the business should take next.
- Each recommended action MUST include "evidence" field with specific review text or pattern that supports it.
- Each recommended action MUST include "impact" (high/medium/low) and "effort" (high/medium/low).
- recommendedActions must be from BUSINESS perspective (operator/owner actions), not customer perspective.
- Each recommended action should follow: Action | Owner | Cadence | KPI structure in the "action" field.
- Only generate a recommended action if it is directly grounded in a specific complaint or failure pattern.
- Do not pad recommendedActions with generic improvement suggestions.
- Never suggest actions directed at customers.
- Ensure output is prescriptive analysis, not descriptive commentary.

Business context:
${input.businessContext?.trim() ? input.businessContext.trim() : "No additional business context provided."}

Reviews (with tags):
${JSON.stringify(input.reviews, null, 2)}
`.trim();

  try {
    const raw = await runModel(prompt);
    const parsed = extractJson<unknown>(raw);
    const validated = ReviewInsightsSchema.safeParse(parsed);
    if (!validated.success) return fallbackInsights(input);
    return validated.data;
  } catch {
    return fallbackInsights(input);
  }
}

export async function generateReviewReply(input: ReplyInput): Promise<ReviewReplyDraft> {
  const prompt = `
You are writing a Google business owner response to a public review for "${input.businessName}".

Return strict JSON with this shape:
{
  "reply": "string",
  "tone": "string",
  "confidence": "high" | "medium" | "low"
}

Requirements:
- Sound human, calm, and brand-safe.
- Thank the customer by intent, not by overusing the exact same wording.
- If the review is negative, acknowledge the issue, apologize when appropriate, and invite offline follow-up.
- If the review is positive, reinforce what they valued and invite them back.
- Keep it between 40 and 100 words.
- Do not invent facts, discounts, or promises.
- Do not include placeholders.

Review:
${JSON.stringify(input.review, null, 2)}

Business context:
${input.businessContext?.trim() ? input.businessContext.trim() : "No additional business context provided."}
`.trim();

  try {
    const raw = await runModel(prompt);
    const parsed = extractJson<unknown>(raw);
    const validated = ReviewReplySchema.safeParse(parsed);
    if (!validated.success) throw new Error("Invalid reply format");
    return validated.data;
  } catch {
    const positive = input.review.rating >= 4;
    return {
      reply: positive
        ? `Thank you for taking the time to share your experience with ${input.businessName}. We are glad to hear you had a positive visit, and we appreciate your support. We look forward to welcoming you again soon.`
        : `Thank you for your feedback. We are sorry your experience with ${input.businessName} did not meet expectations. We take comments like this seriously and would value the chance to understand what went wrong and make it right.`,
      tone: positive ? "warm and appreciative" : "calm and accountable",
      confidence: "medium",
    };
  }
}