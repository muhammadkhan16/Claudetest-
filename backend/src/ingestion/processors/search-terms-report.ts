/**
 * Processor: Amazon Search Terms Report CSV
 *
 * Handles the Advertising Search Term Report — shows which customer
 * search terms triggered ads, with per-term impression/click/sales data.
 */
import { parseCsvBuffer } from "../csv-parser";
import { normalizer, UnifiedRow } from "../normalizer";

export interface ProcessResult {
  rows: UnifiedRow[];
  skipped: number;
  reportType: "search_terms";
}

export async function processSearchTermsReport(
  buffer: Buffer
): Promise<ProcessResult> {
  const { headers, rows } = await parseCsvBuffer(buffer);
  const colIndex = normalizer.buildColumnIndex(headers);

  let skipped = 0;
  const normalized: UnifiedRow[] = [];

  for (const row of rows) {
    const result = normalizer.normalizeRow(row, colIndex);
    if (!result) {
      skipped++;
      continue;
    }
    // Search term rows without an actual search term are structural rows
    if (!result.customer_search_term && !result.keyword) {
      skipped++;
      continue;
    }
    normalized.push(result);
  }

  return { rows: normalized, skipped, reportType: "search_terms" };
}
