/**
 * Profit Engine — SKU Health Analysis
 *
 * Pulls Revenue, COGS, Fees, and Ad Spend from Sellerise API data,
 * calculates Net Profit and Net Margin per SKU, labels health status,
 * and returns the list sorted worst-to-best so problem SKUs surface first.
 *
 * Usage:
 *   const { calculateSkuHealth } = require("./profitEngine");
 *   const results = calculateSkuHealth(selleriseData);
 *
 * ─── Input shape (Sellerise API array) ───────────────────────────────────────
 *   [
 *     {
 *       sku    : string,
 *       revenue: number,   // total sales revenue
 *       cogs   : number,   // cost of goods sold
 *       fees   : number,   // Amazon / FBA fees
 *       adSpend: number,   // PPC ad spend
 *     },
 *     ...
 *   ]
 *
 * ─── Output shape (sorted worst margin first) ────────────────────────────────
 *   [
 *     {
 *       sku      : string,
 *       revenue  : number,
 *       cogs     : number,
 *       fees     : number,
 *       adSpend  : number,
 *       netProfit: number,   // revenue - cogs - fees - adSpend
 *       netMargin: number,   // net profit as a % of revenue (rounded 2 dp)
 *       status   : "Healthy" | "Watchlist" | "Bleeding",
 *       color    : "Green"   | "Yellow"    | "Red",
 *     },
 *     ...
 *   ]
 */

"use strict";

/**
 * Derive the health label and colour from a net margin percentage.
 *
 * @param {number} marginPct
 * @returns {{ status: string, color: string }}
 */
function getHealthLabel(marginPct) {
  if (marginPct > 20) return { status: "Healthy",   color: "Green"  };
  if (marginPct >= 10) return { status: "Watchlist", color: "Yellow" };
  return                      { status: "Bleeding",  color: "Red"    };
}

/**
 * calculateSkuHealth
 *
 * For each SKU in the Sellerise data:
 *   1. Pulls Revenue, COGS, Fees, Ad Spend.
 *   2. Calculates Net Profit  = Revenue - COGS - Fees - Ad Spend.
 *   3. Calculates Net Margin% = (Net Profit / Revenue) * 100.
 *      → If Revenue is 0, margin is treated as 0 to avoid division by zero.
 *   4. Labels the SKU:
 *      - Margin > 20%      → "Healthy"   (Green)
 *      - Margin 10–20%     → "Watchlist" (Yellow)
 *      - Margin < 10%      → "Bleeding"  (Red)
 *   5. Sorts the results worst margin first so problem SKUs are immediate.
 *
 * @param {{
 *   sku    : string,
 *   revenue: number,
 *   cogs   : number,
 *   fees   : number,
 *   adSpend: number
 * }[]} selleriseData
 *
 * @returns {{
 *   sku      : string,
 *   revenue  : number,
 *   cogs     : number,
 *   fees     : number,
 *   adSpend  : number,
 *   netProfit: number,
 *   netMargin: number,
 *   status   : string,
 *   color    : string
 * }[]}
 */
function calculateSkuHealth(selleriseData) {
  const results = selleriseData.map((row) => {
    const revenue  = Number(row.revenue)  || 0;
    const cogs     = Number(row.cogs)     || 0;
    const fees     = Number(row.fees)     || 0;
    const adSpend  = Number(row.adSpend)  || 0;

    const netProfit = revenue - cogs - fees - adSpend;
    const netMargin = revenue > 0
      ? Math.round((netProfit / revenue) * 100 * 100) / 100
      : 0;

    const { status, color } = getHealthLabel(netMargin);

    return {
      sku: row.sku,
      revenue,
      cogs,
      fees,
      adSpend,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin,
      status,
      color,
    };
  });

  // Sort worst margin first — immediate visibility on bleeding SKUs.
  results.sort((a, b) => a.netMargin - b.netMargin);

  return results;
}

module.exports = { calculateSkuHealth };
