export interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function error(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
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

// ── Amazon Image Fetch ───────────────────────────────────────────────────────

const MARKETPLACE_URLS: Record<string, string> = {
  US: "https://www.amazon.com",
  UK: "https://www.amazon.co.uk",
  DE: "https://www.amazon.de",
  FR: "https://www.amazon.fr",
  IT: "https://www.amazon.it",
  ES: "https://www.amazon.es",
  NL: "https://www.amazon.nl",
  CA: "https://www.amazon.ca",
  JP: "https://www.amazon.co.jp",
  AU: "https://www.amazon.com.au",
};

async function handleAmazonImages(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const asin = url.searchParams.get("asin")?.trim().toUpperCase() ?? "";
  const marketplace = (url.searchParams.get("marketplace") ?? "US").toUpperCase();

  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    return error("Invalid ASIN. Must be 10 alphanumeric characters.", 400);
  }

  const baseUrl = MARKETPLACE_URLS[marketplace] ?? MARKETPLACE_URLS.US;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${baseUrl}/dp/${asin}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Referer: "https://www.google.com/",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Amazon returned ${res.status}`);
    }

    const html = await res.text();

    // Extract product title
    const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1].trim() : `Product ${asin}`;

    const images: string[] = [];

    // Method 1: colorImages JSON (double quotes)
    const colorImagesMatch = html.match(/"colorImages"\s*:\s*\{\s*"initial"\s*:\s*(\[[\s\S]*?\])\s*\}/);
    if (colorImagesMatch) {
      try {
        const parsed: Array<{ hiRes?: string; large?: string }> = JSON.parse(colorImagesMatch[1]);
        for (const img of parsed) {
          const imgUrl = img.hiRes || img.large;
          if (imgUrl && imgUrl.startsWith("https://") && !images.includes(imgUrl)) {
            images.push(imgUrl);
          }
        }
      } catch {
        // continue to next method
      }
    }

    // Method 2: single-quote variant
    if (images.length === 0) {
      const galleryMatch = html.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[\s\S]*?\])\s*\}/);
      if (galleryMatch) {
        try {
          const parsed: Array<{ hiRes?: string; large?: string }> = JSON.parse(
            galleryMatch[1].replace(/'/g, '"')
          );
          for (const img of parsed) {
            const imgUrl = img.hiRes || img.large;
            if (imgUrl && imgUrl.startsWith("https://") && !images.includes(imgUrl)) {
              images.push(imgUrl);
            }
          }
        } catch {
          // continue
        }
      }
    }

    // Method 3: regex scan for media-amazon URLs
    if (images.length === 0) {
      const imgMatches = html.matchAll(
        /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+\.(jpg|jpeg|png)/g
      );
      const seen = new Set<string>();
      for (const m of imgMatches) {
        const rawUrl = m[0].replace(/%22/g, "").split('"')[0];
        if (!seen.has(rawUrl)) {
          seen.add(rawUrl);
          const hiRes = rawUrl.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png)$/, ".$1");
          if (!images.includes(hiRes)) images.push(hiRes);
        }
        if (images.length >= 8) break;
      }
    }

    // Extract price
    const priceMatch = html.match(/class="a-price-whole"[^>]*>([0-9,.]+)</);
    const price = priceMatch ? `$${priceMatch[1]}` : "N/A";

    // Extract brand
    const brandMatch = html.match(/id="bylineInfo"[^>]*>[\s\S]*?(?:Visit the|Brand:)\s*<[^>]*>([^<]+)</);
    const brand = brandMatch ? brandMatch[1].trim() : "Unknown Brand";

    if (images.length === 0) {
      return json({
        asin,
        title,
        brand,
        price,
        images: [],
        warning:
          "Amazon blocked the image fetch. This is common due to bot protection. Try a different ASIN or connect your Amazon SP-API account.",
      });
    }

    return json({ asin, title, brand, price, images: images.slice(0, 8) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Failed to fetch product data: ${message}`, 502);
  }
}

// ── Image Enhancement (Claude AI) ───────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  DE: "German",
  FR: "French",
  ES: "Spanish",
  IT: "Italian",
  NL: "Dutch",
  PT: "Portuguese",
};

interface EnhanceRequest {
  asin: string;
  title: string;
  brand: string;
  imageUrls: string[];
  marketplace?: string;
  language?: string;
}

function getMockEnhancements(asin: string, title: string): string {
  return `## Image Enhancement Analysis for ${asin}
**Product:** ${title || "Amazon Product"}

---

### Overall Image Quality Score: 72/100

---

### Main Image Enhancement Plan
**Current Issues:**
- Background could be brighter (pure white #FFFFFF required for Amazon compliance)
- Product angle shows limited depth — rotate 15° for better 3D perspective
- Shadow underneath product is uneven and distracting

**Recommended Actions:**
1. Reshoot on a professional lightbox with 5500K daylight bulbs
2. Use a 45° product angle to show depth and premium feel
3. Ensure product fills 85%+ of the image frame
4. Apply subtle drop shadow instead of cast shadow
5. High-res final export at minimum 2000×2000px

---

### Secondary Images Enhancement (Images 2–7)

**Image 2 — Feature Callout:**
- Add bold text overlays highlighting the top 3 USPs
- Use consistent brand color palette (#2563EB recommended)
- Include a measurement/size comparison graphic

**Image 3 — Lifestyle Shot:**
- Show product in use by target demographic
- Use bright, aspirational setting (modern kitchen/office)
- Include 1–2 lifestyle props that reinforce the brand story

**Image 4 — Before/After or Comparison:**
- Create a split-screen comparison vs. competitors
- Use checkmarks/X icons to highlight advantages
- Include "Why Choose Us" infographic

---

### A+ Content Image Strategy

**Module 1 — Brand Story Banner:**
- Full-width hero image (970×600px)
- Brand origin narrative overlaid on lifestyle backdrop

**Module 2 — Feature Grid (4 columns):**
- One icon + headline + 100-word description per column
- Custom iconography in brand colors

---

### Priority Action Items
| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 Critical | Reshoot main image on white background | +25% CTR | High |
| 🔴 Critical | Add feature callout infographic | +15% CVR | Medium |
| 🟡 High | Lifestyle shot with target customer | +10% CVR | High |
| 🟢 Medium | A+ Content hero banner | +5% Sessions | Medium |`;
}

async function handleEnhanceImages(request: Request, env: Env): Promise<Response> {
  try {
    const body: EnhanceRequest = await request.json();
    const { asin, title, brand, imageUrls, marketplace = "US", language = "EN" } = body;
    const languageName = LANGUAGE_NAMES[language] ?? "English";

    if (!asin || !imageUrls?.length) {
      return error("ASIN and imageUrls required", 400);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ enhancements: getMockEnhancements(asin, title) });
    }

    const imageContent = imageUrls.slice(0, 4).map((url) => ({
      type: "image",
      source: { type: "url", url },
    }));

    const prompt = `You are an expert Amazon listing image consultant specializing in the ${marketplace} marketplace. Analyze these product images for ASIN ${asin} ("${title}" by ${brand}) and provide detailed enhancement recommendations.

IMPORTANT: Write your entire response in ${languageName}. All text, headings, and recommendations must be in ${languageName}.

For each image, identify:
1. What's working well
2. Key improvements needed
3. Specific enhancement suggestions

Then provide:
- Overall image quality score (0-100)
- Main image enhancement plan (with ${marketplace} marketplace compliance requirements)
- Secondary image enhancement recommendations
- Lifestyle/context image ideas
- A+ Content image strategy
- Infographic/feature callout suggestions

Format your response as actionable, specific recommendations that a photographer/designer can execute. Use markdown headings and bullet points for clarity.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              ...imageContent,
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data: { content?: Array<{ text?: string }> } = await response.json();
    const analysisText = data.content?.[0]?.text ?? "";

    return json({ enhancements: analysisText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Enhancement failed: ${message}`, 500);
  }
}

// ── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/ai/listing-analysis" && request.method === "POST") {
      return handleListingAnalysis(request, env);
    }

    if (url.pathname === "/api/amazon-images" && request.method === "GET") {
      return handleAmazonImages(request);
    }

    if (url.pathname === "/api/enhance-images" && request.method === "POST") {
      return handleEnhanceImages(request, env);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ status: "ok" });
    }

    return error("Not found", 404);
  },
};
