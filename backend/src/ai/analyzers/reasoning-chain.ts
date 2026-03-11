/**
 * AI Reasoning Chain Analyzer
 *
 * Architecture:
 *   1. TypeScript pre-processor runs first — computes exact profit leaks,
 *      negative keyword candidates, and scaling signals deterministically.
 *   2. Pre-processor output is embedded into a structured Reasoning Chain
 *      prompt sent to Claude with extended thinking enabled.
 *   3. Claude reasons through the data step-by-step and outputs a
 *      structured IntelligenceReport JSON with three categories:
 *      CRITICAL_ALERTS | PROFIT_OPTIMIZATION | GROWTH_LEVERS
 *
 * The split is intentional: math stays in TypeScript (precise, auditable),
 * qualitative reasoning and strategic recommendations go to Claude.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env";
import {
  preProcess,
  type CampaignMetric,
  type SearchTermRow,
  type PreProcessorResult,
} from "./pre-processor";
import type {
  ContributionMarginResult,
  BreakevenAcosResult,
  TacosResult,
  ForecastResult,
} from "../../metrics/calculators/MetricsEngine";

// ── Input ──────────────────────────────────────────────────────────────────

export interface ReasoningChainInput {
  /** Output from MetricsEngine calculators */
  metrics: {
    contributionMargin: ContributionMarginResult;
    breakeven: BreakevenAcosResult;
    tacos: TacosResult;
    forecast?: ForecastResult;
  };
  /** Campaign-level ACoS vs break-even data */
  campaigns: CampaignMetric[];
  /** Search term rows from ingested Search Terms Report */
  searchTerms: SearchTermRow[];
  /** Optional context */
  context?: {
    clientName?: string;
    reportPeriodDays?: number;
    marketplace?: string;
    totalRevenue?: number;
    totalSpend?: number;
  };
}

// ── Output ─────────────────────────────────────────────────────────────────

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertCategory = "PROFIT_LEAK" | "BUDGET_WASTE" | "ACCOUNT_HEALTH" | "COMPLIANCE";
export type OptimizationType = "BID_ADJUSTMENT" | "NEGATIVE_KEYWORDS" | "BUDGET_REALLOCATION" | "LISTING" | "PRICING";
export type GrowthType = "SCALING" | "NEW_TARGETING" | "DAYPARTING" | "PRODUCT_EXPANSION" | "ORGANIC_RANK";

export interface CriticalAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  detail: string;
  /** Specific campaigns / search terms / ASINs involved */
  affectedEntities: string[];
  /** Dollar value at stake (loss per period) */
  financialImpact: number;
  financialImpactLabel: string;
  /** Concrete next step — actionable in < 30 min */
  immediateAction: string;
  /** Deadline urgency */
  urgency: "TODAY" | "THIS_WEEK" | "THIS_MONTH";
}

export interface ProfitOptimization {
  id: string;
  type: OptimizationType;
  title: string;
  detail: string;
  affectedEntities: string[];
  /** Expected savings or recovered profit */
  estimatedImpact: number;
  estimatedImpactLabel: string;
  steps: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeToImplement: string;
}

export interface GrowthLever {
  id: string;
  type: GrowthType;
  title: string;
  detail: string;
  rationale: string;
  /** Expected revenue uplift or profit increase */
  estimatedUpside: string;
  steps: string[];
  prerequisite?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface IntelligenceReport {
  generatedAt: string;
  reportPeriodDays: number;
  clientName: string;
  overallHealthScore: number;
  executiveSummary: string;
  CRITICAL_ALERTS: CriticalAlert[];
  PROFIT_OPTIMIZATION: ProfitOptimization[];
  GROWTH_LEVERS: GrowthLever[];
  /** Claude's visible reasoning chain (from extended thinking) */
  reasoningChain: string;
  metadata: {
    profitLeaksDetected: number;
    negativeKeywordCandidates: number;
    totalEstimatedLoss: number;
    totalWastedSpend: number;
    potentialRecovery: number;
    scalingCandidates: number;
    modelUsed: string;
    thinkingTokensUsed?: number;
  };
}

// ── Reasoning Chain Prompt Builder ────────────────────────────────────────

function buildReasoningChainPrompt(
  input: ReasoningChainInput,
  preProcessed: PreProcessorResult
): string {
  const ctx = input.context ?? {};
  const periodDays = ctx.reportPeriodDays ?? 30;
  const cm = input.metrics.contributionMargin;
  const be = input.metrics.breakeven;
  const tacos = input.metrics.tacos;

  // Format currency helper
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const topLeaks = preProcessed.profitLeaks.slice(0, 8);
  const topNegKw  = preProcessed.negativeKeywordCandidates.slice(0, 15);
  const topScale  = preProcessed.scalingCandidates.slice(0, 5);

  return `You are a senior Amazon account strategist with deep expertise in PPC optimization, profit engineering, and marketplace growth. You are performing a comprehensive account intelligence review.

═══════════════════════════════════════════════════════
ACCOUNT INTELLIGENCE INPUT DATA
Period: Last ${periodDays} days${ctx.clientName ? ` | Client: ${ctx.clientName}` : ""}${ctx.marketplace ? ` | Marketplace: ${ctx.marketplace}` : ""}
═══════════════════════════════════════════════════════

━━━ SECTION 1: FINANCIAL HEALTH (Metrics Engine Output) ━━━

Contribution Margin Analysis:
  Revenue:               ${fmt(cm.breakdown.revenue)}
  COGS:                 -${fmt(cm.breakdown.cogs)}
  FBA Fees:             -${fmt(cm.breakdown.fbaFees)}
  Referral Fee:         -${fmt(cm.breakdown.referralFee)}
  PPC Spend:            -${fmt(cm.breakdown.ppcSpend)}
  Returns:              -${fmt(cm.breakdown.returns)}
  ─────────────────────────────────────────
  Total Costs:          -${fmt(cm.breakdown.totalCosts)}
  Contribution Margin:   ${fmt(cm.contributionMargin)} (${cm.contributionMarginPct.toFixed(1)}%)

Break-even ACoS:         ${be.breakEvenAcosLabel}
  (Sale price - COGS - Fees) / Sale price
  Pre-ad margin:         ${fmt(be.priorAdMargin)} (${be.priorAdMarginPct.toFixed(1)}%)

TACoS:                   ${tacos.tacosLabel}${tacos.acosLabel ? `\nACoS (ad-attributed):    ${tacos.acosLabel}` : ""}${tacos.paidShare !== undefined ? `\nPaid revenue share:      ${tacos.paidShare.toFixed(1)}%` : ""}

━━━ SECTION 2: PROFIT LEAK ANALYSIS (Pre-Processor Output) ━━━

Campaigns scanned: ${preProcessed.summary.campaignsAnalyzed}
Leaking campaigns: ${preProcessed.summary.leakCount} (${preProcessed.summary.criticalLeakCount} CRITICAL)
Total estimated loss this period: ${fmt(preProcessed.totalLeakEstimate)}

${topLeaks.length === 0 ? "✓ No profit leaks detected — all campaigns within break-even ACoS.\n" : `
Profit Leaks (sorted by dollar loss):
${topLeaks.map((l, i) => `
  ${i + 1}. [${l.severity}] ${l.campaignName}${l.adGroupName ? ` › ${l.adGroupName}` : ""}
     Current ACoS:    ${pct(l.currentAcos)}
     Break-even ACoS: ${pct(l.breakEvenAcos)}
     Overage:        +${l.overage.toFixed(1)}pp above break-even
     Spend:           ${fmt(l.spend)}  |  Revenue: ${fmt(l.revenue)}
     Est. loss:       ${fmt(l.estimatedLoss)} this period`).join("\n")}
`}

━━━ SECTION 3: NEGATIVE KEYWORD CANDIDATES (Pre-Processor Output) ━━━

Total wasted spend identified: ${fmt(preProcessed.totalWastedSpend)}
Candidate terms flagged: ${preProcessed.summary.negKwCandidateCount}

${topNegKw.length === 0 ? "✓ No negative keyword candidates detected above thresholds.\n" : `
Top Negative Keyword Candidates (sorted by wasted spend):
${topNegKw.map((k, i) => `
  ${i + 1}. [${k.priority}] "${k.searchTerm}"
     Campaign: ${k.campaignName}${k.adGroupName ? ` › ${k.adGroupName}` : ""}
     Impressions: ${k.impressions.toLocaleString()} | Clicks: ${k.clicks} | Orders: ${k.orders}
     Spend: ${fmt(k.spend)} | ACoS: ${k.acos === 0 ? "∞ (no sales)" : pct(k.acos)}
     Reason: ${k.reason}
     Suggested action: Add as ${k.suggestedNegativeType}`).join("\n")}
`}

━━━ SECTION 4: SCALING CANDIDATES ━━━

${topScale.length === 0 ? "No campaigns with significant headroom below break-even ACoS detected.\n" : `
Campaigns with room to scale:
${topScale.map((s, i) => `
  ${i + 1}. ${s.campaignName}
     Current ACoS: ${pct(s.currentAcos)} | Break-even: ${pct(s.breakEvenAcos)}
     Headroom: ${s.headroom.toFixed(1)}pp below break-even
     Current Revenue: ${fmt(s.revenue)}`).join("\n")}
`}

${input.metrics.forecast ? `
━━━ SECTION 5: WHAT-IF FORECAST ━━━

Baseline: Net Profit ${fmt(input.metrics.forecast.baseline.netProfit)} | Revenue ${fmt(input.metrics.forecast.baseline.revenue)} | ACoS ${input.metrics.forecast.baseline.acosLabel}

Scenarios:
${input.metrics.forecast.scenarios.map((s) => `  • ${s.label}: Net Profit ${fmt(s.netProfit)} (${s.deltaNetProfitLabel}) | ACoS ${s.acosLabel}`).join("\n")}
` : ""}

═══════════════════════════════════════════════════════
REASONING CHAIN INSTRUCTIONS
═══════════════════════════════════════════════════════

Work through the following steps explicitly in your thinking before producing the final JSON:

STEP 1 — CRITICAL ALERTS
  Review all profit leaks marked CRITICAL. For each:
  - What is the exact dollar loss per period?
  - What is the most likely root cause (over-bidding, broad match bleed, irrelevant traffic)?
  - What single action taken today would stop the bleeding fastest?
  Also check if TACoS is dangerously high (>20%) or CM is negative — these are immediate alerts.

STEP 2 — NEGATIVE KEYWORD ANALYSIS
  For each negative keyword candidate:
  - Is the search term irrelevant to the product, or just poor-converting?
  - Should it be NEGATIVE_EXACT (specific enough to isolate) or NEGATIVE_PHRASE (to block variants)?
  - Cluster related terms together into one action where possible.
  - Prioritize by wasted spend.

STEP 3 — PROFIT OPTIMIZATION
  Identify the 3-5 highest-ROI profit improvement actions:
  - Bid adjustments for over/under-performing campaigns
  - Budget reallocation from leaking to scaling campaigns
  - Negative keyword additions (from Step 2)
  - Any pricing or cost-reduction signals from the CM breakdown
  For each, estimate the $ impact and give specific implementation steps.

STEP 4 — GROWTH LEVERS
  Identify 2-4 strategic opportunities for revenue and profit growth:
  - Which scaling candidates should get budget increases, and by how much?
  - Are there organic rank opportunities signaled by low TACoS + good CVR?
  - What targeting expansions (product, category, competitor) are warranted?
  - What dayparting or placement adjustments could improve efficiency?
  Ground each lever in the actual data — reference specific campaigns or metrics.

STEP 5 — HEALTH SCORE & EXECUTIVE SUMMARY
  Score the account 0-100 based on:
    - CM positivity (0-25 pts): negative CM = 0, >20% = 25
    - ACoS discipline (0-25 pts): all campaigns ≤ break-even = 25
    - Waste control (0-25 pts): wasted spend < 5% of total spend = 25
    - Growth posture (0-25 pts): scaling candidates exist + TACoS < 15% = 25
  Write a 2-3 sentence executive summary for the client.

═══════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════

Respond with a single JSON object. No markdown, no explanation outside the JSON.

{
  "overallHealthScore": <0-100 integer>,
  "executiveSummary": "<2-3 sentences for the client>",
  "CRITICAL_ALERTS": [
    {
      "id": "CA-001",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "category": "PROFIT_LEAK" | "BUDGET_WASTE" | "ACCOUNT_HEALTH" | "COMPLIANCE",
      "title": "<short alert title>",
      "detail": "<specific finding with numbers>",
      "affectedEntities": ["<campaign name>", ...],
      "financialImpact": <number>,
      "financialImpactLabel": "<e.g. '$1,240 lost this period'>",
      "immediateAction": "<single concrete action>",
      "urgency": "TODAY" | "THIS_WEEK" | "THIS_MONTH"
    }
  ],
  "PROFIT_OPTIMIZATION": [
    {
      "id": "PO-001",
      "type": "BID_ADJUSTMENT" | "NEGATIVE_KEYWORDS" | "BUDGET_REALLOCATION" | "LISTING" | "PRICING",
      "title": "<optimization title>",
      "detail": "<what the problem is and why this fix works>",
      "affectedEntities": ["<campaign or search term>", ...],
      "estimatedImpact": <number>,
      "estimatedImpactLabel": "<e.g. 'Save $840/month'>",
      "steps": ["<step 1>", "<step 2>", ...],
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "timeToImplement": "<e.g. '15 minutes'>"
    }
  ],
  "GROWTH_LEVERS": [
    {
      "id": "GL-001",
      "type": "SCALING" | "NEW_TARGETING" | "DAYPARTING" | "PRODUCT_EXPANSION" | "ORGANIC_RANK",
      "title": "<growth opportunity title>",
      "detail": "<what the opportunity is>",
      "rationale": "<why the data supports this action>",
      "estimatedUpside": "<e.g. '+$2,400/month revenue'>",
      "steps": ["<step 1>", "<step 2>", ...],
      "prerequisite": "<optional: what must be done first>",
      "confidence": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}`;
}

// ── Main analyzer ──────────────────────────────────────────────────────────

export async function runReasoningChain(
  input: ReasoningChainInput
): Promise<IntelligenceReport> {
  // Step 1: deterministic pre-processing (always runs, no API needed)
  const preProcessed = preProcess(input.campaigns, input.searchTerms);

  const ctx = input.context ?? {};
  const periodDays = ctx.reportPeriodDays ?? 30;
  const clientName = ctx.clientName ?? "Amazon Account";

  const baseMetadata = {
    profitLeaksDetected:       preProcessed.summary.leakCount,
    negativeKeywordCandidates: preProcessed.summary.negKwCandidateCount,
    totalEstimatedLoss:        preProcessed.totalLeakEstimate,
    totalWastedSpend:          preProcessed.totalWastedSpend,
    potentialRecovery:         round(preProcessed.totalLeakEstimate + preProcessed.totalWastedSpend, 2),
    scalingCandidates:         preProcessed.summary.scalingCandidateCount,
    modelUsed:                 "claude-sonnet-4-6",
  };

  // Step 2: call Claude with extended thinking
  if (!env.ANTHROPIC_API_KEY) {
    return buildMockReport(input, preProcessed, periodDays, clientName, baseMetadata);
  }

  // Dynamic import keeps the module optional at startup (no key → mock path above).
  // `import type Anthropic` at the top is erased at runtime so it costs nothing.
  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  const client = new AnthropicClient({ apiKey: env.ANTHROPIC_API_KEY });

  const prompt = buildReasoningChainPrompt(input, preProcessed);

  // Cast params to MessageCreateParamsNonStreaming so TypeScript resolves the
  // overload to Promise<Message> instead of Promise<Message | Stream<...>>.
  // The `thinking` field is valid at runtime (SDK ≥ 0.27) but not yet in all
  // published @types versions, so we widen through the base params type.
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    stream: false,
    thinking: {
      type: "enabled",
      budget_tokens: 10000,
    },
    messages: [{ role: "user", content: prompt }],
  } as Anthropic.MessageCreateParamsNonStreaming) as Anthropic.Message;

  // The extended-thinking SDK returns a mix of ThinkingBlock and TextBlock.
  // Define the thinking block shape locally — matches SDK spec exactly.
  interface ThinkingBlock {
    type: "thinking";
    thinking: string;
    signature: string;
  }

  let reasoningChain = "";
  let jsonText = "";
  let thinkingTokensUsed: number | undefined;

  for (const block of response.content) {
    if (block.type === "thinking") {
      reasoningChain = (block as unknown as ThinkingBlock).thinking;
    } else if (block.type === "text") {
      jsonText = block.text;
    }
  }

  // `cache_read_input_tokens` is present on extended Usage objects (cached prompts).
  // Guard with `in` before accessing so we don't hit a TS2339 on the base type.
  if (response.usage && "cache_read_input_tokens" in response.usage) {
    thinkingTokensUsed = (response.usage as Anthropic.Usage & { cache_read_input_tokens: number })
      .cache_read_input_tokens;
  }

  // Parse JSON — strip any accidental markdown fences
  const cleaned = jsonText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  let parsed: Omit<IntelligenceReport, "generatedAt" | "reportPeriodDays" | "clientName" | "reasoningChain" | "metadata">;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Reasoning Chain returned invalid JSON.\n\nRaw response:\n${jsonText.slice(0, 500)}`);
  }

  return {
    generatedAt:   new Date().toISOString(),
    reportPeriodDays: periodDays,
    clientName,
    ...parsed,
    reasoningChain,
    metadata: { ...baseMetadata, thinkingTokensUsed },
  };
}

// ── Mock report (no API key) ────────────────────────────────────────────────

function buildMockReport(
  input: ReasoningChainInput,
  pre: PreProcessorResult,
  periodDays: number,
  clientName: string,
  metadata: IntelligenceReport["metadata"]
): IntelligenceReport {
  const cm = input.metrics.contributionMargin;
  const be = input.metrics.breakeven;
  const tacos = input.metrics.tacos;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Score
  let score = 100;
  if (cm.contributionMargin < 0) score -= 30;
  else if (cm.contributionMarginPct < 10) score -= 15;
  score -= Math.min(25, pre.summary.criticalLeakCount * 8);
  score -= Math.min(15, Math.floor(pre.totalWastedSpend / 100) * 2);
  if (tacos.tacos > 0.20) score -= 10;
  score = Math.max(0, Math.min(100, score));

  // CRITICAL_ALERTS
  const CRITICAL_ALERTS: CriticalAlert[] = [];
  let alertIdx = 1;

  if (cm.contributionMargin < 0) {
    CRITICAL_ALERTS.push({
      id: `CA-${String(alertIdx++).padStart(3, "0")}`,
      severity: "CRITICAL",
      category: "ACCOUNT_HEALTH",
      title: "Negative Contribution Margin",
      detail: `Account is generating a contribution margin of ${fmt(cm.contributionMargin)} (${cm.contributionMarginPct.toFixed(1)}%). Every unit sold loses money before overhead.`,
      affectedEntities: ["All Campaigns"],
      financialImpact:      Math.abs(cm.contributionMargin),
      financialImpactLabel: `${fmt(Math.abs(cm.contributionMargin))} lost this period`,
      immediateAction: "Pause all campaigns with ACoS above break-even immediately and review COGS vs price.",
      urgency: "TODAY",
    });
  }

  for (const leak of pre.profitLeaks.filter((l) => l.severity === "CRITICAL").slice(0, 3)) {
    CRITICAL_ALERTS.push({
      id: `CA-${String(alertIdx++).padStart(3, "0")}`,
      severity: "CRITICAL",
      category: "PROFIT_LEAK",
      title: `Profit Leak: ${leak.campaignName}`,
      detail: `ACoS is ${(leak.currentAcos * 100).toFixed(1)}% — ${leak.overage.toFixed(1)}pp above break-even (${(leak.breakEvenAcos * 100).toFixed(1)}%). Losing ${fmt(leak.estimatedLoss)} in profit this period on ${fmt(leak.spend)} of spend.`,
      affectedEntities: [leak.campaignName, ...(leak.adGroupName ? [leak.adGroupName] : [])],
      financialImpact:      leak.estimatedLoss,
      financialImpactLabel: `${fmt(leak.estimatedLoss)} lost this period`,
      immediateAction: `Reduce bids by ${Math.round(leak.overage * 0.6)}% on all keywords in this campaign. Target ACoS: ${(leak.breakEvenAcos * 100).toFixed(1)}%.`,
      urgency: "TODAY",
    });
  }

  if (pre.totalWastedSpend > 50) {
    CRITICAL_ALERTS.push({
      id: `CA-${String(alertIdx++).padStart(3, "0")}`,
      severity: "HIGH",
      category: "BUDGET_WASTE",
      title: `${pre.summary.negKwCandidateCount} Irrelevant Search Terms Burning Budget`,
      detail: `${fmt(pre.totalWastedSpend)} spent on ${pre.summary.negKwCandidateCount} search terms that generated zero orders. These are pure waste.`,
      affectedEntities: pre.negativeKeywordCandidates.slice(0, 5).map((k) => `"${k.searchTerm}"`),
      financialImpact:      pre.totalWastedSpend,
      financialImpactLabel: `${fmt(pre.totalWastedSpend)} wasted this period`,
      immediateAction: "Add the top 5 wasted terms as NEGATIVE EXACT in all affected campaigns today.",
      urgency: "TODAY",
    });
  }

  // PROFIT_OPTIMIZATION
  const PROFIT_OPTIMIZATION: ProfitOptimization[] = [];
  let poIdx = 1;

  if (pre.negativeKeywordCandidates.length > 0) {
    const highPriority = pre.negativeKeywordCandidates.filter((k) => k.priority === "HIGH");
    const allCandidates = pre.negativeKeywordCandidates.slice(0, 10);
    PROFIT_OPTIMIZATION.push({
      id: `PO-${String(poIdx++).padStart(3, "0")}`,
      type: "NEGATIVE_KEYWORDS",
      title: "Add Negative Keywords to Eliminate Wasted Spend",
      detail: `${allCandidates.length} search terms identified as zero-conversion spend traps. Adding these as negatives will immediately redirect that budget to converting terms.`,
      affectedEntities: allCandidates.map((k) => `"${k.searchTerm}" (${k.campaignName})`),
      estimatedImpact:      pre.totalWastedSpend,
      estimatedImpactLabel: `Save ${fmt(pre.totalWastedSpend)} per ${periodDays}-day period`,
      steps: [
        `Navigate to Advertising → Campaign Manager → ${allCandidates[0]?.campaignName ?? "affected campaign"}`,
        "Go to Negative Keywords tab",
        ...highPriority.slice(0, 5).map(
          (k) => `Add "${k.searchTerm}" as ${k.suggestedNegativeType.replace("_", " ").toLowerCase()}`
        ),
        "Repeat for all flagged campaigns listed above",
        "Set a calendar reminder to review search term reports in 7 days",
      ],
      difficulty: "EASY",
      timeToImplement: `${Math.ceil(allCandidates.length * 1.5)} minutes`,
    });
  }

  if (pre.profitLeaks.filter((l) => l.severity !== "CRITICAL").length > 0) {
    const warningLeaks = pre.profitLeaks.filter((l) => l.severity === "WARNING");
    const totalWarningLoss = warningLeaks.reduce((s, l) => s + l.estimatedLoss, 0);
    PROFIT_OPTIMIZATION.push({
      id: `PO-${String(poIdx++).padStart(3, "0")}`,
      type: "BID_ADJUSTMENT",
      title: "Reduce Bids on Campaigns Exceeding Break-even ACoS",
      detail: `${warningLeaks.length} campaigns are above break-even ACoS. Calibrated bid reductions will bring these to profitability without sacrificing significant volume.`,
      affectedEntities: warningLeaks.map((l) => l.campaignName),
      estimatedImpact:      totalWarningLoss,
      estimatedImpactLabel: `Recover ${fmt(totalWarningLoss)} per ${periodDays}-day period`,
      steps: warningLeaks.slice(0, 5).map(
        (l) => `${l.campaignName}: reduce bids by ${Math.min(30, Math.round(l.overage * 0.7))}% (current ACoS ${(l.currentAcos * 100).toFixed(1)}% → target ${(l.breakEvenAcos * 100).toFixed(1)}%)`
      ).concat(["Re-evaluate in 14 days and adjust further if ACoS hasn't improved"]),
      difficulty: "EASY",
      timeToImplement: `${warningLeaks.length * 3} minutes`,
    });
  }

  if (pre.scalingCandidates.length > 0 && pre.profitLeaks.length > 0) {
    const leakSpend = pre.profitLeaks.slice(0, 3).reduce((s, l) => s + l.spend * 0.2, 0);
    PROFIT_OPTIMIZATION.push({
      id: `PO-${String(poIdx++).padStart(3, "0")}`,
      type: "BUDGET_REALLOCATION",
      title: "Shift Budget from Leaking to Scaling Campaigns",
      detail: `Redirect ${fmt(leakSpend)} in freed budget from over-ACoS campaigns to the ${pre.scalingCandidates.length} campaign(s) with proven profitability headroom.`,
      affectedEntities: [
        ...pre.profitLeaks.slice(0, 2).map((l) => `↓ ${l.campaignName}`),
        ...pre.scalingCandidates.slice(0, 2).map((s) => `↑ ${s.campaignName}`),
      ],
      estimatedImpact:      leakSpend * ((pre.scalingCandidates[0]?.headroom ?? 10) / 100),
      estimatedImpactLabel: `+${fmt(leakSpend * 1.3)} net revenue from reallocated budget`,
      steps: [
        `Reduce daily budget on ${pre.profitLeaks[0]?.campaignName} by 20%`,
        ...pre.scalingCandidates.slice(0, 2).map(
          (s) => `Increase budget on "${s.campaignName}" by 20% — it has ${s.headroom.toFixed(1)}pp of ACoS headroom`
        ),
        "Monitor for 7 days before further adjustments",
      ],
      difficulty: "EASY",
      timeToImplement: "10 minutes",
    });
  }

  if (be.breakEvenAcosLabel && tacos.tacos > 0) {
    const taCosTarget = be.breakEvenAcos * 0.7;
    if (tacos.tacos > taCosTarget) {
      PROFIT_OPTIMIZATION.push({
        id: `PO-${String(poIdx++).padStart(3, "0")}`,
        type: "PRICING",
        title: "Review Price / COGS Ratio to Widen Break-even ACoS",
        detail: `Break-even ACoS is ${be.breakEvenAcosLabel}. A 5-10% price increase or cost reduction would widen your advertising buffer and allow more aggressive scaling.`,
        affectedEntities: ["Product Pricing", "COGS / Supplier Terms"],
        estimatedImpact:      cm.breakdown.revenue * 0.05,
        estimatedImpactLabel: `+${fmt(cm.breakdown.revenue * 0.05)} contribution margin at +5% price`,
        steps: [
          "Check competitor pricing — is there room to raise price without losing BSR?",
          "Test a 3-5% price increase on top ASINs using A/B price testing",
          "Renegotiate COGS with supplier if ordering volume has increased",
          `Target: raise break-even ACoS from ${be.breakEvenAcosLabel} to ${((be.breakEvenAcos + 0.05) * 100).toFixed(1)}%`,
        ],
        difficulty: "MEDIUM",
        timeToImplement: "1-2 days for pricing, 2-4 weeks for COGS negotiation",
      });
    }
  }

  // GROWTH_LEVERS
  const GROWTH_LEVERS: GrowthLever[] = [];
  let glIdx = 1;

  for (const s of pre.scalingCandidates.slice(0, 2)) {
    const budgetIncrease = s.revenue * 0.15;
    GROWTH_LEVERS.push({
      id: `GL-${String(glIdx++).padStart(3, "0")}`,
      type: "SCALING",
      title: `Scale "${s.campaignName}" — ${s.headroom.toFixed(1)}pp ACoS Headroom`,
      detail: `This campaign runs at ${(s.currentAcos * 100).toFixed(1)}% ACoS against a ${(s.breakEvenAcos * 100).toFixed(1)}% break-even. It has ${s.headroom.toFixed(1)} percentage points of profitable headroom — increase spend to capture more market share.`,
      rationale: `Current ACoS is ${s.headroom.toFixed(1)}pp below break-even with ${fmt(s.revenue)} in revenue. Scaling by 15-20% should remain profitable while growing impressions.`,
      estimatedUpside: `+${fmt(budgetIncrease * 3)} revenue at current conversion rates`,
      steps: [
        `Increase daily budget by 15% on "${s.campaignName}"`,
        "Monitor ACoS for 7 days — if it stays below break-even, increase another 15%",
        `Add top-performing search terms as exact-match keywords to capture intent`,
        "Set a target ACoS alert at break-even level to auto-pause if crossed",
      ],
      confidence: "HIGH",
    });
  }

  if (tacos.tacos < 0.12 && cm.contributionMarginPct > 15) {
    GROWTH_LEVERS.push({
      id: `GL-${String(glIdx++).padStart(3, "0")}`,
      type: "ORGANIC_RANK",
      title: "Invest in Organic Rank — TACoS and Margins Support It",
      detail: `TACoS of ${(tacos.tacos * 100).toFixed(1)}% and ${cm.contributionMarginPct.toFixed(1)}% contribution margin signal healthy organic-to-paid balance. Increasing PPC velocity will push organic rank, which compounds over time.`,
      rationale: "Low TACoS means strong organic sales relative to ad spend. Incremental PPC investment improves BSR, which drives more organic traffic, reducing TACoS further.",
      estimatedUpside: "+15-25% organic impressions within 60 days of sustained velocity",
      steps: [
        "Identify top 3 keywords with page 2-3 organic rank (use Helium10/DataDive)",
        "Run exact-match campaigns with aggressive bids to hit page 1 for 30 days",
        "Monitor organic rank weekly — pause once page 1 rank is stable for 14 days",
        "Reinvest savings into the next keyword tier",
      ],
      prerequisite: "Maintain campaign budget during rank-push period (30-45 days)",
      confidence: "MEDIUM",
    });
  }

  if (pre.negativeKeywordCandidates.length > 5) {
    GROWTH_LEVERS.push({
      id: `GL-${String(glIdx++).padStart(3, "0")}`,
      type: "NEW_TARGETING",
      title: "Launch Product-Targeting Campaigns for High-Converting ASINs",
      detail: "With irrelevant keyword traffic eliminated, reallocate that budget to product-targeting campaigns. ASIN-targeting reaches shoppers already on competitor or complementary PDPs — typically higher intent.",
      rationale: `${fmt(pre.totalWastedSpend)} in wasted keyword spend can be redirected to product targeting, which typically has 15-30% lower ACoS than broad keyword campaigns.`,
      estimatedUpside: `+${fmt(pre.totalWastedSpend * 1.8)} revenue from reallocated budget at lower ACoS`,
      steps: [
        "Create a new Sponsored Products campaign with Product targeting type",
        "Target top 10 competitor ASINs in your category (find via Category listing)",
        "Set bids at 20% below current average CPC — product targeting often needs lower bids",
        "Add a complementary product targeting group for upsell opportunities",
        "Review weekly and harvest converting ASINs into manual campaigns",
      ],
      confidence: "MEDIUM",
    });
  }

  GROWTH_LEVERS.push({
    id: `GL-${String(glIdx++).padStart(3, "0")}`,
    type: "DAYPARTING",
    title: "Implement Dayparting to Concentrate Budget in Peak CVR Windows",
    detail: "Amazon conversion rates vary significantly by time-of-day. Concentrating spend in high-CVR windows reduces effective CPC and improves ACoS without changing bids.",
    rationale: "Most Amazon categories see peak CVR between 10am-2pm and 7pm-10pm local time. Reducing budget multiplier to 50% during overnight hours (12am-7am) typically saves 15-20% of daily budget.",
    estimatedUpside: "5-12% improvement in effective ACoS with same daily budget",
    steps: [
      "Pull hourly order data from Seller Central → Business Reports → Sales by Hour",
      "Identify your top 3 and bottom 3 CVR hours",
      "In Advertising Console, use 'Bid by placement' and 'Schedule' to reduce bids during low-CVR periods",
      "Run for 14 days, then compare ACoS pre/post",
    ],
    confidence: "MEDIUM",
  });

  const executiveSummary = buildExecutiveSummary(
    score, cm, pre, tacos, periodDays, clientName
  );

  const reasoningChain = buildMockReasoningChain(pre, cm, be, tacos);

  return {
    generatedAt: new Date().toISOString(),
    reportPeriodDays: periodDays,
    clientName,
    overallHealthScore: score,
    executiveSummary,
    CRITICAL_ALERTS,
    PROFIT_OPTIMIZATION,
    GROWTH_LEVERS,
    reasoningChain,
    metadata,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildExecutiveSummary(
  score: number,
  cm: ContributionMarginResult,
  pre: PreProcessorResult,
  tacos: TacosResult,
  periodDays: number,
  clientName: string
): string {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (score < 40) {
    return `${clientName}'s account is in a critical state: contribution margin is ${cm.contributionMargin < 0 ? "negative" : "dangerously low"} at ${cm.contributionMarginPct.toFixed(1)}%, with ${pre.summary.criticalLeakCount} campaigns actively destroying profit above break-even ACoS. Immediate bid cuts and negative keyword additions are required to stop a combined ${fmt(pre.totalLeakEstimate + pre.totalWastedSpend)} in losses over the last ${periodDays} days.`;
  }

  if (score < 65) {
    return `${clientName}'s account is profitable but leaking ${fmt(pre.totalLeakEstimate + pre.totalWastedSpend)} over the last ${periodDays} days through ${pre.summary.leakCount} over-ACoS campaigns and ${pre.summary.negKwCandidateCount} wasted search terms. Addressing these optimizations could recover this margin and improve TACoS from ${(tacos.tacos * 100).toFixed(1)}% within 30 days.`;
  }

  return `${clientName}'s account is performing well with a ${cm.contributionMarginPct.toFixed(1)}% contribution margin and TACoS of ${(tacos.tacos * 100).toFixed(1)}%. There are targeted optimizations available worth ${fmt(pre.totalLeakEstimate + pre.totalWastedSpend)} in recovered profit, plus ${pre.summary.scalingCandidateCount} campaign(s) with proven headroom to scale profitably.`;
}

function buildMockReasoningChain(
  pre: PreProcessorResult,
  cm: ContributionMarginResult,
  be: BreakevenAcosResult,
  tacos: TacosResult
): string {
  const lines: string[] = [
    "=== REASONING CHAIN (Mock — set ANTHROPIC_API_KEY for live reasoning) ===",
    "",
    "STEP 1 — CRITICAL ALERTS",
    `  Contribution margin: ${cm.contributionMarginPct.toFixed(1)}% — ${cm.contributionMargin >= 0 ? "positive, no alert" : "NEGATIVE — immediate action required"}`,
    `  TACoS: ${(tacos.tacos * 100).toFixed(1)}% — ${tacos.tacos > 0.20 ? "ELEVATED above 20%, flag as concern" : "within acceptable range"}`,
    `  Critical profit leaks: ${pre.summary.criticalLeakCount} campaigns above break-even by >15pp`,
    `  Total leak exposure: $${pre.totalLeakEstimate.toFixed(2)}`,
    "",
    "STEP 2 — NEGATIVE KEYWORD ANALYSIS",
    `  Flagged ${pre.summary.negKwCandidateCount} search terms for negative keyword addition`,
    `  Total wasted spend: $${pre.totalWastedSpend.toFixed(2)}`,
    ...pre.negativeKeywordCandidates.slice(0, 5).map(
      (k) => `    • "${k.searchTerm}" — ${k.reason} — suggest ${k.suggestedNegativeType}`
    ),
    "",
    "STEP 3 — PROFIT OPTIMIZATION",
    `  Break-even ACoS: ${be.breakEvenAcosLabel}`,
    `  Campaigns above break-even: ${pre.summary.leakCount}`,
    `  Primary fix: negative keywords ($${pre.totalWastedSpend.toFixed(2)} recovery) + bid reductions ($${pre.totalLeakEstimate.toFixed(2)} recovery)`,
    "",
    "STEP 4 — GROWTH LEVERS",
    `  Scaling candidates: ${pre.summary.scalingCandidateCount} campaigns with >8pp headroom`,
    `  TACoS supports organic investment: ${tacos.tacos < 0.12 ? "YES — TACoS is low" : "NOT YET — reduce TACoS first"}`,
    "",
    "STEP 5 — HEALTH SCORE",
    `  CM score: ${cm.contributionMargin >= 0 ? (cm.contributionMarginPct > 20 ? 25 : 15) : 0}/25`,
    `  ACoS discipline: ${pre.summary.criticalLeakCount === 0 ? 25 : Math.max(0, 25 - pre.summary.criticalLeakCount * 8)}/25`,
    `  Waste control: ${pre.totalWastedSpend < 50 ? 25 : Math.max(0, 25 - Math.floor(pre.totalWastedSpend / 100) * 3)}/25`,
    `  Growth posture: ${pre.summary.scalingCandidateCount > 0 ? 20 : 10}/25`,
  ];
  return lines.join("\n");
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
