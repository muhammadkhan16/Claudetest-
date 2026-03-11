/**
 * High-Speed Batch Insert using pg-promise
 *
 * Uses ColumnSet + helpers.insert for multi-row inserts in a single
 * round-trip — far faster than individual queries in a loop.
 */
import pgPromise from "pg-promise";
import { env } from "../config/env";
import type { UnifiedRow } from "./normalizer";

// ── pg-promise instance (separate from legacy pg Pool) ─────────────────────
const pgp = pgPromise({
  // Log slow queries in development
  query(e) {
    if (env.NODE_ENV === "development" && e.query.length > 200) {
      console.debug(`[pgp] ${e.query.slice(0, 120)}…`);
    }
  },
});

const connectionConfig = env.DATABASE_URL
  ? env.DATABASE_URL
  : {
      host:     env.DB_HOST,
      port:     env.DB_PORT,
      database: env.DB_NAME,
      user:     env.DB_USER,
      password: env.DB_PASSWORD,
    };

export const pgpDb = pgp(connectionConfig);

// ── ColumnSet for ingested_rows ────────────────────────────────────────────
const ingestedRowsCS = new pgp.helpers.ColumnSet(
  [
    "upload_job_id",
    "client_id",
    "report_type",
    "report_date",
    { name: "asin",                 def: null },
    { name: "parent_asin",          def: null },
    { name: "product_title",        def: null },
    { name: "sessions",             def: null },
    { name: "session_pct",          def: null },
    { name: "page_views",           def: null },
    { name: "page_view_pct",        def: null },
    { name: "buy_box_pct",          def: null },
    { name: "units_ordered",        def: null },
    { name: "units_ordered_b2b",    def: null },
    { name: "revenue",              def: null },
    { name: "revenue_b2b",          def: null },
    { name: "order_items",          def: null },
    { name: "unit_session_pct",     def: null },
    { name: "campaign_name",        def: null },
    { name: "ad_group_name",        def: null },
    { name: "keyword",              def: null },
    { name: "match_type",           def: null },
    { name: "customer_search_term", def: null },
    { name: "targeting_expression", def: null },
    { name: "impressions",          def: null },
    { name: "clicks",               def: null },
    { name: "ad_spend",             def: null },
    { name: "ad_sales",             def: null },
    { name: "ad_orders",            def: null },
    { name: "ad_units",             def: null },
    { name: "ctr",                  def: null },
    { name: "cpc",                  def: null },
    { name: "acos",                 def: null },
    { name: "conversion_rate",      def: null },
  ],
  { table: "ingested_rows" }
);

export interface BatchInsertOptions {
  uploadJobId: number;
  clientId: number;
  reportType: string;
  rows: UnifiedRow[];
  chunkSize?: number; // rows per INSERT statement (default 500)
}

export interface BatchInsertResult {
  inserted: number;
  chunks: number;
  durationMs: number;
}

/**
 * Insert rows in chunks using pg-promise helpers.insert.
 * Each chunk is a single multi-row INSERT — no per-row round trips.
 */
export async function batchInsertRows(
  opts: BatchInsertOptions
): Promise<BatchInsertResult> {
  const { uploadJobId, clientId, reportType, rows, chunkSize = 500 } = opts;
  const start = Date.now();

  // Augment each row with job metadata
  const records = rows.map((r) => ({
    upload_job_id:        uploadJobId,
    client_id:            clientId,
    report_type:          reportType,
    report_date:          r.report_date,
    asin:                 r.asin          ?? null,
    parent_asin:          r.parent_asin   ?? null,
    product_title:        r.product_title ?? null,
    sessions:             r.sessions      ?? null,
    session_pct:          r.session_pct   ?? null,
    page_views:           r.page_views    ?? null,
    page_view_pct:        r.page_view_pct ?? null,
    buy_box_pct:          r.buy_box_pct   ?? null,
    units_ordered:        r.units_ordered     ?? null,
    units_ordered_b2b:    r.units_ordered_b2b ?? null,
    revenue:              r.revenue       ?? null,
    revenue_b2b:          r.revenue_b2b   ?? null,
    order_items:          r.order_items   ?? null,
    unit_session_pct:     r.unit_session_pct ?? null,
    campaign_name:        r.campaign_name        ?? null,
    ad_group_name:        r.ad_group_name        ?? null,
    keyword:              r.keyword              ?? null,
    match_type:           r.match_type           ?? null,
    customer_search_term: r.customer_search_term ?? null,
    targeting_expression: r.targeting_expression ?? null,
    impressions:          r.impressions   ?? null,
    clicks:               r.clicks        ?? null,
    ad_spend:             r.ad_spend      ?? null,
    ad_sales:             r.ad_sales      ?? null,
    ad_orders:            r.ad_orders     ?? null,
    ad_units:             r.ad_units      ?? null,
    ctr:                  r.ctr           ?? null,
    cpc:                  r.cpc           ?? null,
    acos:                 r.acos          ?? null,
    conversion_rate:      r.conversion_rate ?? null,
  }));

  let inserted = 0;
  let chunks = 0;

  // Process in chunks inside a single transaction
  await pgpDb.tx(async (t) => {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const sql = pgp.helpers.insert(chunk, ingestedRowsCS);
      await t.none(sql);
      inserted += chunk.length;
      chunks++;
    }
  });

  return { inserted, chunks, durationMs: Date.now() - start };
}
