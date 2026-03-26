/**
 * AI Layer — Listing Analyzer
 * Generates listing optimization suggestions via Claude API.
 */
import { env } from "../../config/env";

export interface ListingInput {
  asin: string;
  title: string;
  bulletPoints: string[];
  description: string;
  keywords: string[];
  category: string;
}

export interface ListingSuggestion {
  field: "title" | "bullets" | "description" | "keywords";
  severity: "critical" | "warning" | "info";
  current: string;
  suggestion: string;
  reason: string;
}

export interface ListingAnalysis {
  asin: string;
  score: number; // 0-100
  suggestions: ListingSuggestion[];
  estimatedTrafficLift: string;
}

export async function analyzeListing(
  input: ListingInput
): Promise<ListingAnalysis> {
  if (!env.ANTHROPIC_API_KEY) {
    return mockListingAnalysis(input);
  }

  // Dynamic import to avoid requiring the package at startup
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const prompt = `You are an Amazon listing optimization expert. Analyze this product listing and provide specific, actionable suggestions.

ASIN: ${input.asin}
Category: ${input.category}
Title: ${input.title}
Bullet Points:
${input.bulletPoints.map((b, i) => `  ${i + 1}. ${b}`).join("\n")}
Description: ${input.description}
Current Keywords: ${input.keywords.join(", ")}

Respond with a JSON object matching this exact structure:
{
  "score": <0-100 integer>,
  "suggestions": [
    {
      "field": "title" | "bullets" | "description" | "keywords",
      "severity": "critical" | "warning" | "info",
      "current": "<current text or relevant excerpt>",
      "suggestion": "<specific improved version>",
      "reason": "<why this change improves ranking/conversion>"
    }
  ],
  "estimatedTrafficLift": "<e.g. '15-25%'>"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response did not contain valid JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  return { asin: input.asin, ...parsed };
}

function mockListingAnalysis(input: ListingInput): ListingAnalysis {
  return {
    asin: input.asin,
    score: 67,
    suggestions: [
      {
        field: "title",
        severity: "critical",
        current: input.title,
        suggestion: `${input.title} | [Top Keyword] | [Secondary Keyword]`,
        reason: "Title lacks high-volume search terms in the first 80 characters.",
      },
      {
        field: "bullets",
        severity: "warning",
        current: input.bulletPoints[0] ?? "",
        suggestion: "Start with a benefit-driven headline in ALL CAPS followed by supporting detail.",
        reason: "First bullet is the highest-visibility area after the title.",
      },
      {
        field: "keywords",
        severity: "info",
        current: input.keywords.slice(0, 3).join(", "),
        suggestion: "Add long-tail variants with 3+ words to capture low-competition traffic.",
        reason: "Long-tail keywords convert at higher rates due to purchase intent.",
      },
    ],
    estimatedTrafficLift: "18-30%",
  };
}
