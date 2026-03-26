/**
 * Processor: Amazon Business Report CSV
 *
 * Handles: Detail Page Sales and Traffic By Child Item,
 *          Detail Page Sales and Traffic By Parent Item,
 *          and similar variants.
 */
import { parseCsvBuffer } from "../csv-parser";
import { normalizer, UnifiedRow } from "../normalizer";

export interface ProcessResult {
  rows: UnifiedRow[];
  skipped: number;
  reportType: "business_report";
}

export async function processBusinessReport(
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
    normalized.push(result);
  }

  return { rows: normalized, skipped, reportType: "business_report" };
}
