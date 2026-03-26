/**
 * Processor: Amazon PPC / Sponsored Products Campaign Report CSV
 *
 * Handles Sponsored Products, Sponsored Brands, Sponsored Display reports.
 * All three share similar header structures with minor naming differences —
 * the normalizer absorbs those differences.
 */
import { parseCsvBuffer } from "../csv-parser";
import { normalizer, UnifiedRow } from "../normalizer";

export interface ProcessResult {
  rows: UnifiedRow[];
  skipped: number;
  reportType: "ppc";
}

export async function processPpcReport(buffer: Buffer): Promise<ProcessResult> {
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
    // PPC rows without a campaign name are aggregate/summary rows — skip them
    if (!result.campaign_name) {
      skipped++;
      continue;
    }
    normalized.push(result);
  }

  return { rows: normalized, skipped, reportType: "ppc" };
}
