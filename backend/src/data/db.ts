/**
 * Data Layer — thin query helper wrapping pg Pool.
 * All repositories use this for DB access; no raw pool usage elsewhere.
 */
import { QueryResult, QueryResultRow } from "pg";
import { pool } from "../config/database";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.debug(`[DB] ${duration}ms | rows: ${result.rowCount} | ${text.slice(0, 80)}`);
  }

  return result;
}

export async function getClient() {
  return pool.connect();
}
