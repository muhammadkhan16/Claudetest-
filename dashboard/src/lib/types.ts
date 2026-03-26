// ── Shared types (mirror backend response shapes) ──────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; code: string };
}

// Metrics
export interface OverviewMetrics {
  revenue: {
    value: number;
    formatted: string;
    change: number;
    changeLabel: string;
    trend: "up" | "down" | "flat";
  };
  orders: {
    value: number;
    change: number;
    changeLabel: string;
    trend: "up" | "down" | "flat";
  };
  adSpend: {
    value: number;
    formatted: string;
    acos: number;
    roas: number;
  };
  activeClients: number;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
  adSpend: number;
  acos: number;
  roas: number;
}

export interface TopProduct {
  asin: string;
  title: string;
  revenue: number;
  units_sold: number;
  share_pct: number;
}

// Clients
export interface Client {
  id: number;
  name: string;
  email: string;
  marketplace: string;
  status: "active" | "inactive" | "trial";
  monthly_budget: number;
  created_at: string;
}

export interface ClientAudit {
  client_id: number;
  client_name: string;
  marketplace: string;
  revenue_30d: number;
  ad_spend_30d: number;
  acos: number;
  orders_30d: number;
  active_products: number;
  health_score: number;
}

// AI — Inputs
export interface ListingInput {
  asin: string;
  title: string;
  bulletPoints: string[];
  description: string;
  keywords: string[];
  category: string;
}

export interface CampaignInput {
  campaignName: string;
  adGroupName: string;
  targetAcos: number;
  currentAcos: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  currentBid: number;
  topKeywords: Array<{ keyword: string; acos: number; spend: number }>;
}

// AI — Outputs
export interface ListingSuggestion {
  field: "title" | "bullets" | "description" | "keywords";
  severity: "critical" | "warning" | "info";
  current: string;
  suggestion: string;
  reason: string;
}

export interface ListingAnalysis {
  asin: string;
  score: number;
  suggestions: ListingSuggestion[];
  estimatedTrafficLift: string;
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

// ── Intelligence Report (Reasoning Chain output) ───────────────────────────

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
  affectedEntities: string[];
  financialImpact: number;
  financialImpactLabel: string;
  immediateAction: string;
  urgency: "TODAY" | "THIS_WEEK" | "THIS_MONTH";
}

export interface ProfitOptimization {
  id: string;
  type: OptimizationType;
  title: string;
  detail: string;
  affectedEntities: string[];
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

// Input for the Reasoning Chain
export interface CampaignMetricInput {
  campaignId?: string | number;
  campaignName: string;
  adGroupName?: string;
  currentAcos: number;
  breakEvenAcos: number;
  spend: number;
  revenue: number;
  orders: number;
  impressions?: number;
  clicks?: number;
  targetAcos?: number;
}

export interface SearchTermInput {
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

export interface ReasoningChainRequest {
  metrics: {
    contributionMargin: {
      contributionMargin: number;
      contributionMarginPct: number;
      breakdown: {
        revenue: number;
        cogs: number;
        fbaFees: number;
        referralFee: number;
        ppcSpend: number;
        returns: number;
        totalCosts: number;
      };
    };
    breakeven: {
      breakEvenAcos: number;
      breakEvenAcosLabel: string;
      profitAtBreakEven: number;
      priorAdMargin: number;
      priorAdMarginPct: number;
    };
    tacos: {
      tacos: number;
      tacosLabel: string;
      acos?: number;
      acosLabel?: string;
      paidRevenue?: number;
      organicRevenue?: number;
      paidShare?: number;
    };
  };
  campaigns: CampaignMetricInput[];
  searchTerms: SearchTermInput[];
  context?: {
    clientName?: string;
    reportPeriodDays?: number;
    marketplace?: string;
  };
}
