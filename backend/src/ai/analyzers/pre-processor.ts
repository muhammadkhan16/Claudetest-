/**
 * AI Pre-Processor — Deterministic Pass
 *
 * Runs before Claude is called. Pure TypeScript math — no AI involved.
 * Identifies and quantifies:
 *   1. Profit leaks  (campaigns where ACoS > break-even ACoS)
 *   2. Negative keyword candidates  (high spend, zero orders)
 *   3. Budget efficiency signals  (budget-limited good performers)
 *
 * Outputs a structured findings object that becomes part of the
 * Reasoning Chain prompt, giving Claude exact numbers to reason over
 * instead of asking it to compute them.
 */

// ── Input types ────────────────────────────────────────────────────────────

export interface CampaignMetric {
  campaignId?: string | number;
  campaignName: string;
  adGroupName?: string;
  currentAcos: number;        // as decimal, e.g. 0.34
  breakEvenAcos: number;      // as decimal, e.g. 0.28
  spend: number;
  revenue: number;
  orders: number;
  impressions?: number;
  clicks?: number;
  targetAcos?: number;        // seller's target, as decimal
}

export interface SearchTermRow {
  searchTerm: string;
  campaignName: string;
  adGroupName?: string;
  matchType?: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
}

// ── Output types ───────────────────────────────────────────────────────────

export type LeakSeverity = "CRITICAL" | "WARNING" | "MONITOR";

export interface ProfitLeak {
  campaignName: string;
  adGroupName?: string;
  currentAcos: number;
  breakEvenAcos: number;
  /** How far over break-even, in percentage points */
  overage: number;
  /** Dollar amount being lost due to overage: spend × (currentAcos - breakEvenAcos) / currentAcos */
  estimatedLoss: number;
  spend: number;
  revenue: number;
  severity: LeakSeverity;
}

export type NegKeywordReason =
  | "ZERO_ORDERS_HIGH_SPEND"
  | "VERY_HIGH_ACOS"
  | "HIGH_CLICKS_NO_CONVERSION";

export interface NegativeKeywordCandidate {
  searchTerm: string;
  campaignName: string;
  adGroupName?: string;
  matchType?: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  acos: number;
  reason: NegKeywordReason;
  /** Suggested negative match type */
  suggestedNegativeType: "NEGATIVE_EXACT" | "NEGATIVE_PHRASE";
  priority: "HIGH" | "MEDIUM";
}

export interface PreProcessorResult {
  profitLeaks: ProfitLeak[];
  negativeKeywordCandidates: NegativeKeywordCandidate[];
  /** Total estimated money lost to profit leaks per period */
  totalLeakEstimate: number;
  /** Total wasted spend from negative keyword candidates */
  totalWastedSpend: number;
  /** Campaigns that are performing well and could be scaled */
  scalingCandidates: Array<{
    campaignName: string;
    currentAcos: number;
    breakEvenAcos: number;
    headroom: number;   // breakEvenAcos - currentAcos (positive = room to scale)
    revenue: number;
  }>;
  summary: {
    campaignsAnalyzed: number;
    leakCount: number;
    criticalLeakCount: number;
    negKwCandidateCount: number;
    scalingCandidateCount: number;
  };
}

// ── Thresholds ─────────────────────────────────────────────────────────────

const THRESHOLDS = {
  /** Min spend ($) before flagging a search term as wasted */
  negKwMinSpend: 5,
  /** Min clicks before flagging no-conversion terms */
  negKwMinClicks: 3,
  /** ACoS overage (pp) above break-even to be CRITICAL */
  criticalOveragePp: 15,
  /** ACoS overage (pp) above break-even to be WARNING */
  warningOveragePp: 5,
  /** Headroom (pp) below break-even to be a scaling candidate */
  scalingHeadroomPp: 8,
};

// ── Main function ──────────────────────────────────────────────────────────

export function preProcess(
  campaigns: CampaignMetric[],
  searchTerms: SearchTermRow[]
): PreProcessorResult {
  const profitLeaks = detectProfitLeaks(campaigns);
  const negativeKeywordCandidates = detectNegativeKeywordCandidates(searchTerms);
  const scalingCandidates = detectScalingCandidates(campaigns);

  const totalLeakEstimate = profitLeaks.reduce((sum, l) => sum + l.estimatedLoss, 0);
  const totalWastedSpend  = negativeKeywordCandidates.reduce((sum, k) => sum + k.spend, 0);

  return {
    profitLeaks,
    negativeKeywordCandidates,
    totalLeakEstimate: round(totalLeakEstimate, 2),
    totalWastedSpend:  round(totalWastedSpend, 2),
    scalingCandidates,
    summary: {
      campaignsAnalyzed:    campaigns.length,
      leakCount:            profitLeaks.length,
      criticalLeakCount:    profitLeaks.filter((l) => l.severity === "CRITICAL").length,
      negKwCandidateCount:  negativeKeywordCandidates.length,
      scalingCandidateCount: scalingCandidates.length,
    },
  };
}

// ── Profit leak detection ──────────────────────────────────────────────────

function detectProfitLeaks(campaigns: CampaignMetric[]): ProfitLeak[] {
  const leaks: ProfitLeak[] = [];

  for (const c of campaigns) {
    if (c.currentAcos <= c.breakEvenAcos) continue;

    const overagePp = (c.currentAcos - c.breakEvenAcos) * 100;

    // Estimated loss: the fraction of spend that's "over the break-even line"
    // At break-even, spend = revenue × breakEvenAcos
    // At current ACoS, spend = revenue × currentAcos
    // Extra spend beyond break-even = revenue × (currentAcos - breakEvenAcos)
    const estimatedLoss = c.revenue > 0
      ? c.revenue * (c.currentAcos - c.breakEvenAcos)
      : c.spend * ((c.currentAcos - c.breakEvenAcos) / c.currentAcos);

    const severity: LeakSeverity =
      overagePp >= THRESHOLDS.criticalOveragePp ? "CRITICAL"
      : overagePp >= THRESHOLDS.warningOveragePp ? "WARNING"
      : "MONITOR";

    leaks.push({
      campaignName:  c.campaignName,
      adGroupName:   c.adGroupName,
      currentAcos:   round(c.currentAcos, 4),
      breakEvenAcos: round(c.breakEvenAcos, 4),
      overage:       round(overagePp, 1),
      estimatedLoss: round(estimatedLoss, 2),
      spend:         round(c.spend, 2),
      revenue:       round(c.revenue, 2),
      severity,
    });
  }

  // Sort by estimated loss descending (largest bleeds first)
  return leaks.sort((a, b) => b.estimatedLoss - a.estimatedLoss);
}

// ── Negative keyword detection ─────────────────────────────────────────────

function detectNegativeKeywordCandidates(
  searchTerms: SearchTermRow[]
): NegativeKeywordCandidate[] {
  const candidates: NegativeKeywordCandidate[] = [];

  for (const st of searchTerms) {
    const acos = st.sales > 0 ? st.spend / st.sales : Infinity;
    let reason: NegKeywordReason | null = null;
    let priority: "HIGH" | "MEDIUM" = "MEDIUM";

    if (st.spend >= THRESHOLDS.negKwMinSpend && st.orders === 0) {
      reason = "ZERO_ORDERS_HIGH_SPEND";
      priority = st.spend >= THRESHOLDS.negKwMinSpend * 3 ? "HIGH" : "MEDIUM";
    } else if (
      st.clicks >= THRESHOLDS.negKwMinClicks &&
      st.orders === 0 &&
      st.spend >= THRESHOLDS.negKwMinSpend
    ) {
      reason = "HIGH_CLICKS_NO_CONVERSION";
      priority = st.clicks >= 10 ? "HIGH" : "MEDIUM";
    } else if (
      acos !== Infinity &&
      acos > 2.5 &&   // >250% ACoS = clearly unprofitable
      st.spend >= THRESHOLDS.negKwMinSpend * 2
    ) {
      reason = "VERY_HIGH_ACOS";
      priority = "MEDIUM";
    }

    if (!reason) continue;

    // Exact negatives for specific product/brand terms; phrase for generic terms
    const wordCount = st.searchTerm.trim().split(/\s+/).length;
    const suggestedNegativeType =
      wordCount <= 2 ? "NEGATIVE_PHRASE" : "NEGATIVE_EXACT";

    candidates.push({
      searchTerm:          st.searchTerm,
      campaignName:        st.campaignName,
      adGroupName:         st.adGroupName,
      matchType:           st.matchType,
      impressions:         st.impressions,
      clicks:              st.clicks,
      spend:               round(st.spend, 2),
      orders:              st.orders,
      acos:                acos === Infinity ? 0 : round(acos, 4),
      reason,
      suggestedNegativeType,
      priority,
    });
  }

  // Sort by spend descending (biggest waste first)
  return candidates.sort((a, b) => b.spend - a.spend);
}

// ── Scaling candidate detection ────────────────────────────────────────────

function detectScalingCandidates(
  campaigns: CampaignMetric[]
): PreProcessorResult["scalingCandidates"] {
  return campaigns
    .filter((c) => {
      const headroomPp = (c.breakEvenAcos - c.currentAcos) * 100;
      return headroomPp >= THRESHOLDS.scalingHeadroomPp && c.revenue > 0;
    })
    .map((c) => ({
      campaignName: c.campaignName,
      currentAcos:  round(c.currentAcos, 4),
      breakEvenAcos: round(c.breakEvenAcos, 4),
      headroom:     round((c.breakEvenAcos - c.currentAcos) * 100, 1),
      revenue:      round(c.revenue, 2),
    }))
    .sort((a, b) => b.headroom - a.headroom);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
