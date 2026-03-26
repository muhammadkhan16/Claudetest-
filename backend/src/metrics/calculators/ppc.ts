/**
 * Metrics Engine — PPC Calculator
 * Pure functions for PPC/advertising metric computations.
 */

export interface PpcRaw {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
}

export interface PpcMetrics {
  ctr: number;       // click-through rate %
  cpc: number;       // cost per click $
  cvr: number;       // conversion rate %
  acos: number;      // advertising cost of sales %
  roas: number;      // return on ad spend
  cpa: number;       // cost per acquisition $
}

export function calcPpcMetrics(raw: PpcRaw): PpcMetrics {
  const ctr = raw.impressions > 0
    ? (raw.clicks / raw.impressions) * 100 : 0;

  const cpc = raw.clicks > 0
    ? raw.spend / raw.clicks : 0;

  const cvr = raw.clicks > 0
    ? (raw.orders / raw.clicks) * 100 : 0;

  const acos = raw.sales > 0
    ? (raw.spend / raw.sales) * 100 : 0;

  const roas = raw.spend > 0
    ? raw.sales / raw.spend : 0;

  const cpa = raw.orders > 0
    ? raw.spend / raw.orders : 0;

  return {
    ctr:  Math.round(ctr  * 100) / 100,
    cpc:  Math.round(cpc  * 100) / 100,
    cvr:  Math.round(cvr  * 100) / 100,
    acos: Math.round(acos * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    cpa:  Math.round(cpa  * 100) / 100,
  };
}

export interface BidRecommendation {
  currentBid: number;
  recommendedBid: number;
  reason: string;
}

export function recommendBid(
  currentBid: number,
  currentAcos: number,
  targetAcos: number
): BidRecommendation {
  if (currentAcos === 0) {
    return { currentBid, recommendedBid: currentBid, reason: "Insufficient data" };
  }

  const multiplier = targetAcos / currentAcos;
  const recommendedBid = Math.round(currentBid * multiplier * 100) / 100;

  let reason: string;
  if (multiplier > 1.1) reason = "Increase bid — ACoS below target, room to scale";
  else if (multiplier < 0.9) reason = "Decrease bid — ACoS above target, reduce waste";
  else reason = "Bid is optimal for target ACoS";

  return { currentBid, recommendedBid, reason };
}
