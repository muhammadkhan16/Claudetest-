import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English", DE: "German", FR: "French", ES: "Spanish",
  IT: "Italian", NL: "Dutch", PT: "Portuguese",
};

interface EnhanceRequest {
  asin: string;
  title: string;
  brand: string;
  imageUrls: string[];
  marketplace?: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhanceRequest = await request.json();
    const { asin, title, brand, imageUrls, marketplace = "US", language = "EN" } = body;
    const languageName = LANGUAGE_NAMES[language] ?? "English";

    if (!asin || !imageUrls?.length) {
      return NextResponse.json({ error: "ASIN and imageUrls required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Return mock enhancement when no API key
      return NextResponse.json({ enhancements: getMockEnhancements(asin, title) });
    }

    // Build image content blocks for Claude
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
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
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

    const data = await response.json();
    const analysisText = data.content?.[0]?.text ?? "";

    return NextResponse.json({ enhancements: analysisText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Enhancement failed: ${message}` },
      { status: 500 }
    );
  }
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

**Image 5 — Technical/Detail Shot:**
- Close-up of key differentiating features
- Add callout arrows with feature labels
- Show material quality and texture

**Image 6 — Packaging Shot:**
- Display full packaging + unboxing experience
- Show what's included (accessories, documentation)
- Reinforce trust with certifications/awards shown

**Image 7 — Social Proof / Awards:**
- "Best Seller" badge overlay if applicable
- Customer rating stars graphic
- Press mentions or certification badges

---

### A+ Content Image Strategy

**Module 1 — Brand Story Banner:**
- Full-width hero image (970×600px)
- Brand origin narrative overlaid on lifestyle backdrop
- Consistent color palette with main listing

**Module 2 — Feature Grid (4 columns):**
- One icon + headline + 100-word description per column
- Custom iconography in brand colors
- White background for clean look

**Module 3 — Comparison Chart:**
- Your product vs. 3 competitors
- Highlight your 5 strongest differentiators
- Mobile-optimized layout

---

### Lifestyle/Context Image Ideas
1. **In-situ use case** — show product solving the customer's pain point
2. **Gifting occasion** — wrapped packaging for seasonal relevance
3. **Scale reference** — product next to common object (hand, coin, ruler)
4. **Night/Day variation** — show versatility in different lighting/settings

---

### Priority Action Items
| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 Critical | Reshoot main image on white background | +25% CTR | High |
| 🔴 Critical | Add feature callout infographic | +15% CVR | Medium |
| 🟡 High | Lifestyle shot with target customer | +10% CVR | High |
| 🟡 High | Packaging/unboxing image | +8% CVR | Medium |
| 🟢 Medium | A+ Content hero banner | +5% Sessions | Medium |
| 🟢 Medium | Comparison chart module | +7% CVR | Low |`;
}
