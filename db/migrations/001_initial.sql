-- ============================================================
-- Amazon Intelligence Dashboard — Initial Schema
-- Migration: 001_initial
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ── Clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  marketplace     TEXT        NOT NULL DEFAULT 'US',  -- US, UK, DE, JP, etc.
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'trial')),
  monthly_budget  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Products ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  client_id   INT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  asin        CHAR(10)    NOT NULL,
  title       TEXT        NOT NULL,
  category    TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'suppressed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, asin)
);

CREATE INDEX IF NOT EXISTS idx_products_client_id  ON products(client_id);
CREATE INDEX IF NOT EXISTS idx_products_asin       ON products(asin);

-- ── Daily Metrics (aggregated per client per day) ───────────
CREATE TABLE IF NOT EXISTS daily_metrics (
  id          BIGSERIAL   PRIMARY KEY,
  client_id   INT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  revenue     NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders      INT         NOT NULL DEFAULT 0,
  units_sold  INT         NOT NULL DEFAULT 0,
  ad_spend    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sessions    INT         NOT NULL DEFAULT 0,
  page_views  INT         NOT NULL DEFAULT 0,
  UNIQUE (client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_client_date
  ON daily_metrics(client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date
  ON daily_metrics(date DESC);

-- ── Product Metrics (per product per day) ────────────────────
CREATE TABLE IF NOT EXISTS product_metrics (
  id               BIGSERIAL   PRIMARY KEY,
  product_id       INT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_id        INT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  revenue          NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders           INT         NOT NULL DEFAULT 0,
  units_sold       INT         NOT NULL DEFAULT 0,
  sessions         INT         NOT NULL DEFAULT 0,
  conversion_rate  NUMERIC(6,4) NOT NULL DEFAULT 0,
  ad_spend         NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions      INT         NOT NULL DEFAULT 0,
  clicks           INT         NOT NULL DEFAULT 0,
  UNIQUE (product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_product_metrics_product_date
  ON product_metrics(product_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_product_metrics_client_date
  ON product_metrics(client_id, date DESC);

-- ── PPC Campaigns ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppc_campaigns (
  id              SERIAL      PRIMARY KEY,
  client_id       INT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_name   TEXT        NOT NULL,
  campaign_type   TEXT        NOT NULL DEFAULT 'Sponsored Products'
                    CHECK (campaign_type IN ('Sponsored Products', 'Sponsored Brands', 'Sponsored Display')),
  targeting_type  TEXT        NOT NULL DEFAULT 'MANUAL'
                    CHECK (targeting_type IN ('MANUAL', 'AUTO')),
  status          TEXT        NOT NULL DEFAULT 'ENABLED'
                    CHECK (status IN ('ENABLED', 'PAUSED', 'ARCHIVED')),
  daily_budget    NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_acos     NUMERIC(6,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppc_campaigns_client
  ON ppc_campaigns(client_id);

-- ── PPC Daily Metrics ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppc_daily_metrics (
  id            BIGSERIAL   PRIMARY KEY,
  campaign_id   INT         NOT NULL REFERENCES ppc_campaigns(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  impressions   INT         NOT NULL DEFAULT 0,
  clicks        INT         NOT NULL DEFAULT 0,
  spend         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales         NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders        INT         NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ppc_daily_campaign_date
  ON ppc_daily_metrics(campaign_id, date DESC);

-- ── Timestamps trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
