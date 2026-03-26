/**
 * SQP Engine — Search Query Performance Gap Analysis
 *
 * Compares Search Query Performance (SQP) data with the Targeting Report
 * to surface missing Exact Match coverage and underperforming keywords.
 *
 * Usage:
 *   const { getFinalGapAnalysis } = require("./sqpEngine");
 *   const results = getFinalGapAnalysis(sqpData, targetingData);
 *
 * ─── Input shapes ────────────────────────────────────────────────────────────
 *
 *   sqpData (array of top 50 SQP rows):
 *   [
 *     {
 *       query             : string,   // search query text
 *       searchVolume      : number,   // total search volume
 *       brandPurchaseShare: number,   // 0–1 decimal, e.g. 0.07 = 7 %
 *     },
 *     ...
 *   ]
 *
 *   targetingData (active targeting report rows):
 *   [
 *     {
 *       query    : string,   // keyword / target text
 *       matchType: string,   // "Exact", "Phrase", "Broad", etc.
 *     },
 *     ...
 *   ]
 *
 * ─── Output shape (per gap row) ──────────────────────────────────────────────
 *
 *   {
 *     query             : string,
 *     searchVolume      : number,
 *     brandPurchaseShare: number,
 *     label             : "Missing Coverage" | "Low Share - Increase Bids",
 *     potentialUnitGain : number | null,
 *   }
 */

"use strict";

/**
 * Build a Set of query strings that have an active Exact Match entry
 * in the Targeting Report (normalised to lowercase for comparison).
 *
 * @param {{ query: string, matchType: string }[]} targetingData
 * @returns {Set<string>}
 */
function buildExactMatchSet(targetingData) {
  const exactMatches = new Set();

  for (const row of targetingData) {
    if (
      typeof row.matchType === "string" &&
      row.matchType.trim().toLowerCase() === "exact"
    ) {
      exactMatches.add(row.query.trim().toLowerCase());
    }
  }

  return exactMatches;
}

/**
 * getFinalGapAnalysis
 *
 * Iterates the top 50 SQP queries and applies three rules:
 *
 *   Rule 1 — Missing Coverage
 *     The query has no Exact Match entry in the Targeting Report.
 *     → label: "Missing Coverage"
 *
 *   Rule 2 — Potential Unit Gain (calculated for every Missing Coverage row)
 *     potentialUnitGain = searchVolume × (1 − brandPurchaseShare)
 *     Represents the addressable unit opportunity being left uncaptured.
 *
 *   Rule 3 — Low Share on a live Exact Match keyword
 *     The query IS in Exact Match but brandPurchaseShare < 0.10 (< 10 %).
 *     → label: "Low Share - Increase Bids"
 *     potentialUnitGain is null (coverage exists; bid strength is the lever).
 *
 *   Healthy rows (Exact Match present + share ≥ 10 %) are omitted — no gap.
 *
 * @param {{ query: string, searchVolume: number, brandPurchaseShare: number }[]} sqpData
 * @param {{ query: string, matchType: string }[]} targetingData
 * @returns {{
 *   query: string,
 *   searchVolume: number,
 *   brandPurchaseShare: number,
 *   label: string,
 *   potentialUnitGain: number | null
 * }[]}
 */
function getFinalGapAnalysis(sqpData, targetingData) {
  // Honour the "Top 50" scope — caller's sort order is preserved.
  const top50 = sqpData.slice(0, 50);

  const exactMatchSet = buildExactMatchSet(targetingData);
  const results = [];

  for (const row of top50) {
    const normalisedQuery = row.query.trim().toLowerCase();
    const hasExactMatch = exactMatchSet.has(normalisedQuery);

    if (!hasExactMatch) {
      // Rules 1 & 2 — not targeted at all
      results.push({
        query: row.query,
        searchVolume: row.searchVolume,
        brandPurchaseShare: row.brandPurchaseShare,
        label: "Missing Coverage",
        potentialUnitGain: Math.round(
          row.searchVolume * (1 - row.brandPurchaseShare)
        ),
      });
    } else if (row.brandPurchaseShare < 0.1) {
      // Rule 3 — targeted but under-performing
      results.push({
        query: row.query,
        searchVolume: row.searchVolume,
        brandPurchaseShare: row.brandPurchaseShare,
        label: "Low Share - Increase Bids",
        potentialUnitGain: null,
      });
    }
    // Healthy: Exact Match present + share ≥ 10 % → excluded from output.
  }

  return results;
}

module.exports = { getFinalGapAnalysis };
