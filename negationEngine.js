const negationThreshold = 10;

/**
 * Processes Amazon Search Term Report data and identifies wasteful search terms.
 * A "bad" keyword has clicks above the threshold but zero orders.
 *
 * @param {Array<Object>} searchTermData - Array of rows from the Search Term Report
 * @returns {Array<Object>} List of bad keywords with wasted spend and click count
 */
function processSearchTermReport(searchTermData) {
  const badKeywords = searchTermData
    .filter(row =>
      row.Clicks > negationThreshold &&
      row.Orders === 0 &&
      row["Match Type"]?.toLowerCase() !== "exact"
    )
    .map(row => ({
      searchTerm: row["Search Term"],
      matchType: row["Match Type"],
      clicks: row.Clicks,
      wastedSpend: parseFloat((row.Clicks * row.CPC).toFixed(2)),
    }))
    .sort((a, b) => b.wastedSpend - a.wastedSpend);

  return badKeywords;
}

// --- Example Usage ---
const exampleData = [
  { "Search Term": "cheap bluetooth speaker",  Clicks: 25, Orders: 0, CPC: 0.85 },
  { "Search Term": "wireless headphones review", Clicks: 15, Orders: 0, CPC: 1.20 },
  { "Search Term": "buy noise cancelling headphones", Clicks: 30, Orders: 5, CPC: 1.50 },
  { "Search Term": "free headphones",            Clicks: 8,  Orders: 0, CPC: 0.60 },
  { "Search Term": "headphone repair service",   Clicks: 12, Orders: 0, CPC: 0.95 },
];

const results = processSearchTermReport(exampleData);

console.log("=== Negative Keyword Candidates ===");
console.log(`Threshold: ${negationThreshold} clicks with 0 orders\n`);

results.forEach(kw => {
  console.log(`Search Term : ${kw.searchTerm}`);
  console.log(`Clicks      : ${kw.clicks}`);
  console.log(`Wasted Spend: $${kw.wastedSpend}`);
  console.log("---");
});

module.exports = { processSearchTermReport };
