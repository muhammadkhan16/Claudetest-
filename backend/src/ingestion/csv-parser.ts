/**
 * CSV Parser
 * Streams a CSV buffer through csv-parse and returns headers + rows.
 */
import { parse } from "csv-parse";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export async function parseCsvBuffer(buffer: Buffer): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const records: string[][] = [];

    parse(buffer, {
      relax_column_count: true,   // Amazon CSVs sometimes have trailing commas
      skip_empty_lines: true,
      trim: true,
      bom: true,                  // Strip BOM from Windows-encoded files
    })
      .on("data", (row: string[]) => records.push(row))
      .on("error", reject)
      .on("end", () => {
        if (records.length === 0) {
          reject(new Error("CSV file is empty"));
          return;
        }
        const [headers, ...rows] = records;
        resolve({ headers, rows });
      });
  });
}
