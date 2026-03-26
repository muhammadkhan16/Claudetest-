const { processSearchTermReport } = require("./negationEngine");

const testData = [
  { "Search Term": "cheap power bank",  Clicks: 15, Orders: 0, CPC: 1.00, "Match Type": "Broad"  }, // Should be caught
  { "Search Term": "best power bank",   Clicks: 5,  Orders: 0, CPC: 0.50, "Match Type": "Broad"  }, // Ignored - below 10 clicks
  { "Search Term": "usb c charger",     Clicks: 20, Orders: 2, CPC: 1.50, "Match Type": "Phrase" }, // Ignored - has orders
  { "Search Term": "power bank 10000mah", Clicks: 20, Orders: 0, CPC: 1.20, "Match Type": "Exact" }, // Ignored - Exact match
];

const results = processSearchTermReport(testData);

console.log("=== Negation Engine Test ===\n");

if (results.length === 0) {
  console.log("No bad keywords found.");
} else {
  results.forEach(kw => {
    console.log(`Search Term : ${kw.searchTerm}`);
    console.log(`Match Type  : ${kw.matchType}`);
    console.log(`Clicks      : ${kw.clicks}`);
    console.log(`Wasted Spend: $${kw.wastedSpend}`);
    console.log("---");
  });
}

console.log(`\nTotal wasteful terms found: ${results.length}`);
