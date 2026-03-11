-- ============================================================
-- Amazon Intelligence Dashboard — Upload & Ingestion Schema
-- Migration: 002_uploads
-- ============================================================

-- Upload job tracking
CREATE TABLE IF NOT EXISTS upload_jobs (
  id            BIGSERIAL   PRIMARY KEY,
  client_id     INT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_type   TEXT        NOT NULL
                  CHECK (report_type IN ('business_report', 'ppc', 'search_terms')),
  filename      TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_parsed   INT         NOT NULL DEFAULT 0,
  rows_inserted INT         NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_jobs_client
  ON upload_jobs(client_id, created_at DESC);

-- ── Normalized ingestion table ────────────────────────────────────────────
-- Single wide table for all report types — unset fields are NULL.
CREATE TABLE IF NOT EXISTS ingested_rows (
  id                    BIGSERIAL     PRIMARY KEY,
  upload_job_id         BIGINT        NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,
  client_id             INT           NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_type           TEXT          NOT NULL,
  report_date           DATE          NOT NULL,

  -- Product
  asin                  CHAR(10),
  parent_asin           CHAR(10),
  product_title         TEXT,

  -- Traffic (Business Report)
  sessions              INT,
  session_pct           NUMERIC(6,4),
  page_views            INT,
  page_view_pct         NUMERIC(6,4),
  buy_box_pct           NUMERIC(6,4),

  -- Sales (Business Report)
  units_ordered         INT,
  units_ordered_b2b     INT,
  revenue               NUMERIC(14,2),
  revenue_b2b           NUMERIC(14,2),
  order_items           INT,
  unit_session_pct      NUMERIC(6,4),

  -- PPC / Search Terms campaign context
  campaign_name         TEXT,
  ad_group_name         TEXT,
  keyword               TEXT,
  match_type            TEXT,
  customer_search_term  TEXT,
  targeting_expression  TEXT,

  -- Advertising metrics (PPC + Search Terms)
  impressions           INT,
  clicks                INT,
  ad_spend              NUMERIC(12,2),
  ad_sales              NUMERIC(14,2),
  ad_orders             INT,
  ad_units              INT,
  ctr                   NUMERIC(8,6),
  cpc                   NUMERIC(8,4),
  acos                  NUMERIC(8,4),
  conversion_rate       NUMERIC(8,6),

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingested_rows_upload
  ON ingested_rows(upload_job_id);

CREATE INDEX IF NOT EXISTS idx_ingested_rows_client_date
  ON ingested_rows(client_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_ingested_rows_asin
  ON ingested_rows(asin) WHERE asin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingested_rows_campaign
  ON ingested_rows(client_id, campaign_name) WHERE campaign_name IS NOT NULL;
