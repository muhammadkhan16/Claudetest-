/**
 * Data Layer — Uploads Repository
 */
import { query } from "../db";

export interface UploadJob {
  id: number;
  client_id: number;
  report_type: "business_report" | "ppc" | "search_terms";
  filename: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  rows_parsed: number;
  rows_inserted: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export const uploadsRepository = {
  async create(
    clientId: number,
    reportType: string,
    filename: string,
    fileSize: number
  ): Promise<UploadJob> {
    const result = await query<UploadJob>(
      `INSERT INTO upload_jobs (client_id, report_type, filename, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, reportType, filename, fileSize]
    );
    return result.rows[0];
  },

  async markProcessing(id: number): Promise<void> {
    await query(
      `UPDATE upload_jobs SET status = 'processing', started_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async markCompleted(
    id: number,
    rowsParsed: number,
    rowsInserted: number
  ): Promise<void> {
    await query(
      `UPDATE upload_jobs
       SET status = 'completed', rows_parsed = $2, rows_inserted = $3, completed_at = NOW()
       WHERE id = $1`,
      [id, rowsParsed, rowsInserted]
    );
  },

  async markFailed(id: number, errorMessage: string): Promise<void> {
    await query(
      `UPDATE upload_jobs
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1`,
      [id, errorMessage]
    );
  },

  async findByClient(clientId: number, limit = 20): Promise<UploadJob[]> {
    const result = await query<UploadJob>(
      `SELECT * FROM upload_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [clientId, limit]
    );
    return result.rows;
  },

  async findById(id: number): Promise<UploadJob | null> {
    const result = await query<UploadJob>(
      `SELECT * FROM upload_jobs WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },
};
