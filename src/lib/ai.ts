type InsightInput = {
  businessName: string;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    createdAt: string;
  }>;
};

type ReplyInput = {
  businessName: string;
  review: {
    author: string;
    rating: number;
    text: string;
    createdAt: string;
  };
};

export type ReviewInsights = {
  summary: string;
  strengths: string[];
  issues: string[];
  opportunities: string[];
  actionPlan: string[];
  customerTone: "positive" | "mixed" | "negative";
  responseStyle: string;
};

export type ReviewReplyDraft = {
  reply: string;
  tone: string;
  confidence: "high" | "medium" | "low";
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
  if (ratings.length === 0) {
    return 0;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function snippet(text: string, limit = 96) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

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
  const ratings = input.reviews.map((review) => review.rating);
  const averageRating = summarizeRatings(ratings);
  const negativeReviews = input.reviews.filter((review) => review.rating <= 2);
  const neutralReviews = input.reviews.filter((review) => review.rating === 3);
  const positiveReviews = input.reviews.filter((review) => review.rating >= 4);
  const positiveTerms = topTerms(positiveReviews.map((review) => review.text));
  const negativeTerms = topTerms(negativeReviews.map((review) => review.text));
  const allTerms = topTerms(input.reviews.map((review) => review.text));

  const strengths = [
    positiveReviews[0]
      ? `Customers specifically praised: "${snippet(positiveReviews[0].text)}"`
      : `Higher-rated feedback for ${input.businessName} is limited, so recent wins are not clearly reinforced.`,
    positiveTerms[0]
      ? `Positive mentions repeatedly reference ${positiveTerms.slice(0, 2).join(" and ")}.`
      : `Positive reviews do not yet show one dominant strength customers consistently mention.`,
    `Average rating across the analyzed reviews is ${averageRating.toFixed(1)}/5.`,
  ];

  const issues = [
    negativeReviews[0]
      ? `A recent low-rated review said: "${snippet(negativeReviews[0].text)}"`
      : "There are no strong negative reviews in the current sample, but weak spots can still be hidden inside neutral feedback.",
    negativeTerms[0]
      ? `Repeated complaint themes point to ${negativeTerms.slice(0, 3).join(", ")}.`
      : neutralReviews[0]
        ? `Neutral feedback suggests inconsistency: "${snippet(neutralReviews[0].text)}"`
        : "The review set is small, so complaint patterns are still emerging.",
    `${negativeReviews.length} low-rated review(s) and ${neutralReviews.length} neutral review(s) need active follow-up.`,
  ];

  const opportunities = [
    allTerms[0]
      ? `The strongest recurring topics in this business's reviews are ${allTerms.slice(0, 4).join(", ")}. These should guide service improvements and replies.`
      : "Collect more detailed reviews so recurring operational themes become clearer.",
    positiveReviews.length > 0
      ? "Use the same words customers use in positive reviews when training staff and improving offers."
      : "Encourage more happy customers to leave detailed reviews so the business has clearer positive proof points.",
    negativeReviews.length > 0
      ? "Turn repeated complaints into one visible operational fix and mention that fix in future owner replies."
      : "Maintain response speed and consistency before minor issues turn into low-rated reviews.",
  ];

  const actionPlan = [
    negativeReviews[0]
      ? `Resolve the issue described in "${snippet(negativeReviews[0].text, 72)}" and confirm whether it reflects a repeat problem.`
      : "Review recent neutral feedback and identify one service improvement before ratings slip.",
    positiveTerms[0]
      ? `Protect the strengths customers mention most often: ${positiveTerms.slice(0, 2).join(" and ")}.`
      : "Identify one part of the experience that consistently earns praise and make it repeatable.",
    "Reply to new reviews quickly, especially low-rated ones, with a response that acknowledges the exact issue raised.",
  ];

  return {
    summary: `${input.businessName} currently has ${input.reviews.length} analyzed review(s) with an average rating of ${averageRating.toFixed(1)}/5. The strongest signals come from ${
      positiveTerms.length > 0 ? positiveTerms.slice(0, 2).join(" and ") : "a small set of positive comments"
    }, while the main risk areas center on ${
      negativeTerms.length > 0 ? negativeTerms.slice(0, 2).join(" and ") : "service inconsistency"
    }. The next improvements should focus on the exact problems mentioned in recent low-rated or neutral reviews, not generic reputation work.`,
    strengths,
    issues,
    opportunities,
    actionPlan,
    customerTone:
      averageRating >= 4 ? "positive" : averageRating >= 3 ? "mixed" : "negative",
    responseStyle:
      averageRating >= 4
        ? "Warm, grateful, and specific to what customers praised."
        : "Calm, accountable, and tailored to the exact complaint raised.",
  };
}

function getProvider() {
  const forcedProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (forcedProvider === "openai" && process.env.OPENAI_API_KEY) {
    return "openai" as const;
  }

  if (forcedProvider === "gemini" && process.env.GEMINI_API_KEY) {
    return "gemini" as const;
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai" as const;
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini" as const;
  }

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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
            status?: string;
          };
        }
      | null;

    throw new Error(payload?.error?.message || "Gemini request failed.");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
        }
      | null;

    throw new Error(payload?.error?.message || "OpenAI request failed.");
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };

  return payload.output_text ?? "";
}

async function runModel(prompt: string) {
  const provider = getProvider();

  if (provider === "openai") {
    return callOpenAI(prompt);
  }

  return callGemini(prompt);
}

export async function generateReviewInsights(
  input: InsightInput,
): Promise<ReviewInsights> {
  const prompt = `
You are a senior customer-experience strategist helping a local business improve review performance.

Analyze the reviews below for "${input.businessName}".
Return strict JSON with this shape:
{
  "summary": "string",
  "strengths": ["string"],
  "issues": ["string"],
  "opportunities": ["string"],
  "actionPlan": ["string"],
  "customerTone": "positive" | "mixed" | "negative",
  "responseStyle": "string"
}

Requirements:
- Be concrete and commercially useful.
- Identify repeat themes, operational issues, staff/service issues, product issues, and reputation risks.
- Mention what the business should stop, start, and improve.
- Do not mention that you are an AI.
- Keep summary under 120 words.
- Each array should contain 3 to 5 concise bullets.
- Use only evidence grounded in the reviews provided.
- Refer to exact review details, wording, or patterns from this specific business.
- Avoid generic statements that could apply to any business.
- If a theme appears only once, say it is a single-instance signal rather than a repeated pattern.

Reviews:
${JSON.stringify(input.reviews, null, 2)}
`.trim();

  try {
    const raw = await runModel(prompt);
    return extractJson<ReviewInsights>(raw);
  } catch {
    return fallbackInsights(input);
  }
}

export async function generateReviewReply(
  input: ReplyInput,
): Promise<ReviewReplyDraft> {
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
`.trim();

  try {
    const raw = await runModel(prompt);
    return extractJson<ReviewReplyDraft>(raw);
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
