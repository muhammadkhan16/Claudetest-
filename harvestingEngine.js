const targetAcos = 30; // Change this to adjust the maximum acceptable ACOS (%)

/**
 * Processes Amazon Search Term Report data to find new keyword opportunities.
 * Filters for high-converting terms not already targeted as Exact Match.
 *
 * @param {Array<Object>} searchTermData    - Rows from the Search Term Report
 * @param {Array<string>} existingKeywords  - List of terms already targeted as Exact Match
 * @returns {Array<Object>} New keyword opportunities with Search Term, Orders, ACOS, and Priority
 */
function harvestKeywords(searchTermData, existingKeywords = []) {
  const ordersThreshold = 3;

  // Normalize existing keywords to lowercase for case-insensitive comparison
  const exactTargeted = new Set(existingKeywords.map(kw => kw.toLowerCase()));

  const opportunities = searchTermData
    .filter(row => {
      // Rule 1: Must have more than 3 orders
      if (row.Orders <= ordersThreshold) return false;

      // Rule 2: ACOS must be within target
      if (row.ACOS > targetAcos) return false;

      // Rule 3: Skip rows that are already Exact Match type
      if (row["Match Type"]?.toLowerCase() === "exact") return false;

      // Rule 4: Skip if the term is already targeted as Exact Match elsewhere
      if (exactTargeted.has(row["Search Term"].toLowerCase())) return false;

      return true;
    })
    .map(row => ({
      searchTerm: row["Search Term"],
      matchType: row["Match Type"],
      orders: row.Orders,
      acos: row.ACOS,
      priority: row.Orders > 10 ? "High Priority" : "Standard",
    }))
    .sort((a, b) => a.acos - b.acos); // Best (lowest) ACOS first

  return opportunities;
}

// --- Example Usage ---
const existingExactKeywords = [
  "portable charger",   // Already targeted — should be skipped
  "wireless earbuds",
];

const exampleData = [
  { "Search Term": "fast charging power bank",  Orders: 8,  ACOS: 18.5, CPC: 1.10, "Match Type": "Broad"  }, // Standard opportunity
  { "Search Term": "portable charger",          Orders: 12, ACOS: 14.2, CPC: 0.95, "Match Type": "Phrase" }, // Skipped - already exact targeted
  { "Search Term": "usb c power bank 20000mah", Orders: 5,  ACOS: 22.0, CPC: 1.30, "Match Type": "Auto"   }, // Standard opportunity
  { "Search Term": "power bank bulk buy",       Orders: 15, ACOS: 12.0, CPC: 1.40, "Match Type": "Broad"  }, // High Priority opportunity
  { "Search Term": "wireless earbuds",          Orders: 6,  ACOS: 19.0, CPC: 1.00, "Match Type": "Broad"  }, // Skipped - already exact targeted
  { "Search Term": "power bank for iphone",     Orders: 4,  ACOS: 25.5, CPC: 1.20, "Match Type": "Exact"  }, // Skipped - is Exact Match type
  { "Search Term": "slim power bank",           Orders: 2,  ACOS: 20.0, CPC: 0.80, "Match Type": "Broad"  }, // Skipped - below orders threshold
  { "Search Term": "power bank waterproof",     Orders: 5,  ACOS: 35.0, CPC: 0.90, "Match Type": "Broad"  }, // Skipped - ACOS too high
];

const results = harvestKeywords(exampleData, existingExactKeywords);

console.log("=== Keyword Harvesting Results ===");
console.log(`Filters: Orders > 3 | ACOS <= ${targetAcos}% | No Exact Match\n`);

if (results.length === 0) {
  console.log("No new keyword opportunities found.");
} else {
  results.forEach(kw => {
    console.log(`Search Term : ${kw.searchTerm}`);
    console.log(`Match Type  : ${kw.matchType}`);
    console.log(`Orders      : ${kw.orders}`);
    console.log(`ACOS        : ${kw.acos}%`);
    console.log(`Priority    : ${kw.priority}`);
    console.log("---");
  });
}

console.log(`\nNew keyword opportunities found: ${results.length}`);

module.exports = { harvestKeywords };
