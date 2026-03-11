/**
 * AI Layer — PPC Analyzer
 * Uses Claude to surface campaign insights beyond pure math.
 */
import { env } from "../../config/env";

export interface CampaignInput {
  campaignName: string;
  adGroupName: string;
  targetAcos: number;
  currentAcos: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  topKeywords: Array<{ keyword: string; acos: number; spend: number }>;
}

export interface PpcInsight {
  type: "opportunity" | "waste" | "alert" | "suggestion";
  title: string;
  detail: string;
  estimatedImpact: string;
}

export interface PpcAnalysis {
  campaignName: string;
  overallHealthScore: number;
  insights: PpcInsight[];
  priorityActions: string[];
}

export async function analyzePpcCampaign(
  input: CampaignInput
): Promise<PpcAnalysis> {
  if (!env.ANTHROPIC_API_KEY) {
    return mockPpcAnalysis(input);
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const prompt = `You are an Amazon PPC optimization expert. Analyze this campaign and provide actionable insights.

Campaign: ${input.campaignName}
Ad Group: ${input.adGroupName}
Target ACoS: ${input.targetAcos}%
Current ACoS: ${input.currentAcos}%
Impressions: ${input.impressions.toLocaleString()}
Clicks: ${input.clicks.toLocaleString()}
Spend: $${input.spend.toFixed(2)}
Sales: $${input.sales.toFixed(2)}
Top Keywords by Spend:
${input.topKeywords.map((k) => `  - "${k.keyword}": ACoS ${k.acos}%, Spend $${k.spend}`).join("\n")}

Respond with JSON:
{
  "overallHealthScore": <0-100>,
  "insights": [
    {
      "type": "opportunity" | "waste" | "alert" | "suggestion",
      "title": "<short title>",
      "detail": "<specific finding>",
      "estimatedImpact": "<e.g. 'Save $200/month' or 'Increase sales 15%'>"
    }
  ],
  "priorityActions": ["<action 1>", "<action 2>", "<action 3>"]
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
  return { campaignName: input.campaignName, ...parsed };
}

function mockPpcAnalysis(input: CampaignInput): PpcAnalysis {
  const acosGap = input.currentAcos - input.targetAcos;
  return {
    campaignName: input.campaignName,
    overallHealthScore: acosGap > 10 ? 45 : acosGap > 0 ? 68 : 82,
    insights: [
      {
        type: acosGap > 5 ? "alert" : "opportunity",
        title: acosGap > 5 ? "ACoS Exceeds Target" : "Scaling Opportunity",
        detail: acosGap > 5
          ? `Current ACoS (${input.currentAcos}%) is ${acosGap.toFixed(1)}pp above target. Reduce bids on high-spend, low-converting keywords.`
          : `ACoS is within target. Increase budgets on top-performing keywords to capture more market share.`,
        estimatedImpact: acosGap > 5 ? `Save $${(input.spend * 0.15).toFixed(0)}/month` : "Scale revenue 20-35%",
      },
      {
        type: "waste",
        title: "Irrelevant Search Terms",
        detail: "Add negative keywords for broad-match terms generating clicks without conversions.",
        estimatedImpact: "Reduce wasted spend 8-12%",
      },
      {
        type: "suggestion",
        title: "Dayparting Opportunity",
        detail: "Run ads at full budget during peak hours (10am-2pm, 7pm-9pm) and reduce overnight.",
        estimatedImpact: "Improve CVR by 5-10%",
      },
    ],
    priorityActions: [
      "Pause keywords with >3 clicks and 0 sales in the last 14 days",
      "Add negative exact match for top wasted spend terms",
      "Increase bids 15% on keywords with ACoS below target",
    ],
  };
}
