export interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function error(message: string, status = 500) {
  return new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ── Listing Analysis ────────────────────────────────────────────────────────

interface ListingInput {
  productName: string;
  category: string;
  currentTitle: string;
  currentDescription: string;
  bulletPoints: string[];
  keywords: string;
}

interface ListingResult {
  score: number;
  estimatedTrafficLift: string;
  title: { current: string; optimized: string };
  description: { current: string; optimized: string };
  bullets: Array<{ current: string; optimized: string }>;
}

async function handleListingAnalysis(
  request: Request,
  env: Env
): Promise<Response> {
  const input: ListingInput = await request.json();

  if (!env.ANTHROPIC_API_KEY) {
    return error("ANTHROPIC_API_KEY not configured", 500);
  }

  const bulletList = input.bulletPoints
    .map((b, i) => `Bullet ${i + 1}: ${b || "(empty)"}`)
    .join("\n");

  const prompt = `You are an Amazon listing optimization expert. Optimize this product listing to maximize search ranking and conversion rate.

Product: ${input.productName}
Category: ${input.category}
Target Keywords: ${input.keywords}

CURRENT LISTING:
Title: ${input.currentTitle}
Description: ${input.currentDescription}
${bulletList}

Return a JSON object with this exact structure (no markdown, raw JSON only):
{
  "score": <integer 0-100 rating of the current listing>,
  "estimatedTrafficLift": "<e.g. '20-35%'>",
  "title": {
    "current": "${input.currentTitle}",
    "optimized": "<optimized title under 200 chars with primary keywords>"
  },
  "description": {
    "current": "${input.currentDescription}",
    "optimized": "<optimized description 150-300 words, keyword-rich, benefit-focused>"
  },
  "bullets": [
    { "current": "<bullet 1 text>", "optimized": "<ALL CAPS HOOK — detailed benefit with keyword>" },
    { "current": "<bullet 2 text>", "optimized": "<ALL CAPS HOOK — detailed benefit with keyword>" },
    { "current": "<bullet 3 text>", "optimized": "<ALL CAPS HOOK — detailed benefit with keyword>" },
    { "current": "<bullet 4 text>", "optimized": "<ALL CAPS HOOK — detailed benefit with keyword>" },
    { "current": "<bullet 5 text>", "optimized": "<ALL CAPS HOOK — detailed benefit with keyword>" }
  ]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return error(`Anthropic API error: ${errText}`, 500);
  }

  const aiResponse: { content: Array<{ type: string; text: string }> } =
    await response.json();

  const text =
    aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return error("Invalid AI response");

  const result: ListingResult = JSON.parse(jsonMatch[0]);
  return json(result);
}

// ── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    if (
      url.pathname === "/api/ai/listing-analysis" &&
      request.method === "POST"
    ) {
      return handleListingAnalysis(request, env);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ status: "ok" });
    }

    return error("Not found", 404);
  },
};
