-- ============================================================
-- Amazon Intelligence Dashboard — Seed Data
-- ============================================================

-- Clients
INSERT INTO clients (name, email, marketplace, status, monthly_budget) VALUES
  ('Apex Brands LLC',     'apex@example.com',     'US', 'active', 25000),
  ('Nordic Home Co.',     'nordic@example.com',   'US', 'active', 15000),
  ('TechGadget Pro',      'techpro@example.com',  'US', 'active', 40000),
  ('Wellness Essentials', 'wellness@example.com', 'UK', 'active', 10000),
  ('Outdoor Ventures',    'outdoor@example.com',  'US', 'trial',   5000)
ON CONFLICT (email) DO NOTHING;

-- Products (client_id=1: Apex Brands)
INSERT INTO products (client_id, asin, title, category, status) VALUES
  (1, 'B08N5LNQCX', 'Apex Stainless Steel Water Bottle 32oz', 'Sports & Outdoors', 'active'),
  (1, 'B09K7XMRQZ', 'Apex Premium Travel Mug 16oz',          'Kitchen',           'active'),
  (1, 'B07WRQYZXP', 'Apex Insulated Lunch Box',              'Kitchen',           'active'),
  (2, 'B08LMKZPQR', 'Nordic Minimalist Desk Lamp LED',       'Home & Office',     'active'),
  (2, 'B09NXYZABC', 'Nordic Cable Management Box',           'Home & Office',     'active'),
  (3, 'B07TXY1234', 'TechGadget USB-C Hub 7-in-1',          'Electronics',       'active'),
  (3, 'B08ABCDEF1', 'TechGadget Wireless Charger 15W',       'Electronics',       'active')
ON CONFLICT (client_id, asin) DO NOTHING;

-- Daily Metrics (last 60 days for client 1)
INSERT INTO daily_metrics (client_id, date, revenue, orders, units_sold, ad_spend, sessions, page_views)
SELECT
  1,
  CURRENT_DATE - n,
  3500 + (random() * 2000)::numeric(14,2),
  (80  + (random() * 60))::int,
  (100 + (random() * 80))::int,
  (500 + (random() * 400))::numeric(12,2),
  (1200 + (random() * 600))::int,
  (2000 + (random() * 1000))::int
FROM generate_series(0, 59) AS n
ON CONFLICT (client_id, date) DO NOTHING;

-- Daily Metrics (last 60 days for client 2)
INSERT INTO daily_metrics (client_id, date, revenue, orders, units_sold, ad_spend, sessions, page_views)
SELECT
  2,
  CURRENT_DATE - n,
  2000 + (random() * 1200)::numeric(14,2),
  (50  + (random() * 40))::int,
  (60  + (random() * 50))::int,
  (300 + (random() * 250))::numeric(12,2),
  (800 + (random() * 400))::int,
  (1400 + (random() * 600))::int
FROM generate_series(0, 59) AS n
ON CONFLICT (client_id, date) DO NOTHING;

-- Daily Metrics (last 60 days for client 3)
INSERT INTO daily_metrics (client_id, date, revenue, orders, units_sold, ad_spend, sessions, page_views)
SELECT
  3,
  CURRENT_DATE - n,
  5000 + (random() * 3000)::numeric(14,2),
  (120 + (random() * 80))::int,
  (150 + (random() * 100))::int,
  (900 + (random() * 600))::numeric(12,2),
  (2000 + (random() * 800))::int,
  (3500 + (random() * 1200))::int
FROM generate_series(0, 59) AS n
ON CONFLICT (client_id, date) DO NOTHING;

-- PPC Campaigns
INSERT INTO ppc_campaigns (client_id, campaign_name, campaign_type, targeting_type, status, daily_budget, target_acos) VALUES
  (1, 'Apex WaterBottle - SP Auto',    'Sponsored Products', 'AUTO',   'ENABLED', 50,  22),
  (1, 'Apex WaterBottle - SP Manual',  'Sponsored Products', 'MANUAL', 'ENABLED', 100, 18),
  (1, 'Apex TravelMug - SP Auto',      'Sponsored Products', 'AUTO',   'ENABLED', 40,  25),
  (3, 'TechGadget Hub - SP Manual',    'Sponsored Products', 'MANUAL', 'ENABLED', 150, 20),
  (3, 'TechGadget Charger - SP Auto',  'Sponsored Products', 'AUTO',   'ENABLED', 80,  22)
ON CONFLICT DO NOTHING;
