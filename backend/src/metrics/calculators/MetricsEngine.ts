/**
 * MetricsEngine — Advanced Financial Calculators
 *
 * Covers:
 *  1. Contribution Margin
 *  2. Break-even ACoS
 *  3. TACoS (Total Advertising Cost of Sales)
 *  4. What-if Forecast Model
 *
 * All pure functions — no I/O, no side effects. Trivially testable.
 */

// ── 1. Contribution Margin ────────────────────────────────────────────────

export interface ContributionMarginInput {
  /** Gross revenue from sales */
  revenue: number;
  /** Cost of goods sold per unit × units sold */
  cogs: number;
  /** Amazon FBA fulfillment fees */
  fbaFees: number;
  /** Amazon referral fee (percentage of revenue, e.g. 0.15 for 15%) */
  referralFeeRate: number;
  /** Total PPC / advertising spend */
  ppcSpend: number;
  /** Returns — dollar value of refunded orders */
  returns: number;
}

export interface ContributionMarginResult {
  /** Revenue minus all variable costs */
  contributionMargin: number;
  /** CM as a percentage of revenue */
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
}

export function calcContributionMargin(
  input: ContributionMarginInput
): ContributionMarginResult {
  const referralFee = input.revenue * input.referralFeeRate;
  const totalCosts = input.cogs + input.fbaFees + referralFee + input.ppcSpend + input.returns;
  const contributionMargin = input.revenue - totalCosts;
  const contributionMarginPct =
    input.revenue === 0 ? 0 : (contributionMargin / input.revenue) * 100;

  return {
    contributionMargin:    round(contributionMargin, 2),
    contributionMarginPct: round(contributionMarginPct, 2),
    breakdown: {
      revenue:      round(input.revenue, 2),
      cogs:         round(input.cogs, 2),
      fbaFees:      round(input.fbaFees, 2),
      referralFee:  round(referralFee, 2),
      ppcSpend:     round(input.ppcSpend, 2),
      returns:      round(input.returns, 2),
      totalCosts:   round(totalCosts, 2),
    },
  };
}

// ── 2. Break-even ACoS ────────────────────────────────────────────────────

export interface BreakevenAcosInput {
  /** Selling price per unit */
  salePrice: number;
  /** Cost of goods per unit */
  cogs: number;
  /** FBA fee per unit */
  fbaFee: number;
  /** Referral fee rate (0–1), e.g. 0.15 */
  referralFeeRate: number;
}

export interface BreakevenAcosResult {
  /** Max ACoS at which a sale breaks even (as a decimal, e.g. 0.32 = 32%) */
  breakEvenAcos: number;
  /** Formatted as percentage string */
  breakEvenAcosLabel: string;
  /** Profit per unit at break-even (should be ~0) */
  profitAtBreakEven: number;
  /** Net margin after all fees but before ads */
  priorAdMargin: number;
  priorAdMarginPct: number;
}

export function calcBreakevenAcos(input: BreakevenAcosInput): BreakevenAcosResult {
  const referralFee = input.salePrice * input.referralFeeRate;
  const totalFees = input.fbaFee + referralFee;
  const profitBeforeAds = input.salePrice - input.cogs - totalFees;

  // Break-even ACoS = profit before ads / sale price
  const breakEvenAcos =
    input.salePrice === 0 ? 0 : profitBeforeAds / input.salePrice;

  const priorAdMarginPct =
    input.salePrice === 0 ? 0 : (profitBeforeAds / input.salePrice) * 100;

  return {
    breakEvenAcos:       round(Math.max(0, breakEvenAcos), 4),
    breakEvenAcosLabel:  `${round(Math.max(0, breakEvenAcos) * 100, 1)}%`,
    profitAtBreakEven:   0,
    priorAdMargin:       round(profitBeforeAds, 2),
    priorAdMarginPct:    round(priorAdMarginPct, 2),
  };
}

// ── 3. TACoS ──────────────────────────────────────────────────────────────

export interface TacosInput {
  /** Total PPC / advertising spend across all campaigns */
  totalPpcSpend: number;
  /** Total revenue including both organic and paid sales */
  totalRevenue: number;
  /** Optional: organic-only revenue for split view */
  organicRevenue?: number;
}

export interface TacosResult {
  tacos: number;       // as decimal
  tacosLabel: string;  // formatted %
  acos?: number;       // ad-attributed ACoS if organicRevenue provided
  acosLabel?: string;
  paidRevenue?: number;
  organicRevenue?: number;
  paidShare?: number;  // % of total revenue from ads
}

export function calcTacos(input: TacosInput): TacosResult {
  const tacos = input.totalRevenue === 0
    ? 0
    : input.totalPpcSpend / input.totalRevenue;

  const result: TacosResult = {
    tacos:      round(tacos, 4),
    tacosLabel: `${round(tacos * 100, 2)}%`,
  };

  if (input.organicRevenue !== undefined) {
    const paidRevenue = input.totalRevenue - input.organicRevenue;
    const acos = paidRevenue === 0 ? 0 : input.totalPpcSpend / paidRevenue;
    const paidShare = input.totalRevenue === 0 ? 0 : (paidRevenue / input.totalRevenue) * 100;

    result.acos          = round(acos, 4);
    result.acosLabel     = `${round(acos * 100, 2)}%`;
    result.paidRevenue   = round(paidRevenue, 2);
    result.organicRevenue = round(input.organicRevenue, 2);
    result.paidShare     = round(paidShare, 2);
  }

  return result;
}

// ── 4. What-if Forecast Model ──────────────────────────────────────────────

export interface ForecastBaselineInput {
  /** Current daily / period ad spend */
  currentSpend: number;
  /** Current cost per click */
  currentCpc: number;
  /** Current conversion rate (orders / clicks, as decimal e.g. 0.12) */
  currentConversionRate: number;
  /** Current average order value */
  currentAov: number;
  /** Unit COGS */
  cogs: number;
  /** FBA fee per unit */
  fbaFee: number;
  /** Referral fee rate (0–1) */
  referralFeeRate: number;
}

export interface ForecastScenario {
  /** How much to change spend (e.g. 0.15 = +15%, -0.10 = -10%) */
  spendChangePct: number;
  /** Override CPC for this scenario (optional, defaults to current) */
  newCpc?: number;
  /** Override conversion rate (optional) */
  newConversionRate?: number;
  /** Override AOV (optional) */
  newAov?: number;
  label?: string;
}

export interface ForecastScenarioResult {
  label: string;
  spend: number;
  clicks: number;
  orders: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  acos: number;
  acosLabel: string;
  tacos: number;
  tacosLabel: string;
  roi: number; // net profit / spend
  deltaNetProfit: number; // vs baseline
  deltaNetProfitLabel: string;
}

export interface ForecastResult {
  baseline: ForecastScenarioResult;
  scenarios: ForecastScenarioResult[];
}

export function runForecast(
  base: ForecastBaselineInput,
  scenarios: ForecastScenario[]
): ForecastResult {
  const buildScenario = (
    spend: number,
    cpc: number,
    cvr: number,
    aov: number,
    label: string
  ): ForecastScenarioResult => {
    const clicks = cpc === 0 ? 0 : spend / cpc;
    const orders = clicks * cvr;
    const revenue = orders * aov;
    const referralFee = revenue * base.referralFeeRate;
    const totalFees = (base.fbaFee + base.cogs) * orders + referralFee;
    const grossProfit = revenue - totalFees;
    const netProfit = grossProfit - spend;
    const acos = revenue === 0 ? 0 : spend / revenue;
    const tacos = revenue === 0 ? 0 : spend / revenue; // same since all revenue is ad-attributed in this model
    const roi = spend === 0 ? 0 : netProfit / spend;

    return {
      label,
      spend:           round(spend, 2),
      clicks:          round(clicks, 0),
      orders:          round(orders, 1),
      revenue:         round(revenue, 2),
      grossProfit:     round(grossProfit, 2),
      netProfit:       round(netProfit, 2),
      acos:            round(acos, 4),
      acosLabel:       `${round(acos * 100, 1)}%`,
      tacos:           round(tacos, 4),
      tacosLabel:      `${round(tacos * 100, 1)}%`,
      roi:             round(roi, 4),
      deltaNetProfit:  0, // filled in below
      deltaNetProfitLabel: "",
    };
  };

  const baseline = buildScenario(
    base.currentSpend,
    base.currentCpc,
    base.currentConversionRate,
    base.currentAov,
    "Baseline"
  );

  const scenarioResults = scenarios.map((s) => {
    const spend  = base.currentSpend  * (1 + s.spendChangePct);
    const cpc    = s.newCpc            ?? base.currentCpc;
    const cvr    = s.newConversionRate ?? base.currentConversionRate;
    const aov    = s.newAov            ?? base.currentAov;

    const label = s.label ?? formatScenarioLabel(s);
    const result = buildScenario(spend, cpc, cvr, aov, label);

    const deltaNetProfit = result.netProfit - baseline.netProfit;
    result.deltaNetProfit = round(deltaNetProfit, 2);
    result.deltaNetProfitLabel =
      `${deltaNetProfit >= 0 ? "+" : ""}$${round(deltaNetProfit, 2).toFixed(2)}`;

    return result;
  });

  return { baseline, scenarios: scenarioResults };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function formatScenarioLabel(s: ForecastScenario): string {
  const parts: string[] = [];
  const sign = s.spendChangePct >= 0 ? "+" : "";
  parts.push(`Spend ${sign}${(s.spendChangePct * 100).toFixed(0)}%`);
  if (s.newCpc !== undefined)            parts.push(`CPC $${s.newCpc}`);
  if (s.newConversionRate !== undefined) parts.push(`CVR ${(s.newConversionRate * 100).toFixed(1)}%`);
  return parts.join(", ");
}
