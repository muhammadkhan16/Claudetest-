/**
 * Ingested Data Routes
 *
 * Aggregates rows from `ingested_rows` (uploaded CSVs) into
 * the shapes the dashboard pages need.
 *
 * GET /api/ingested/products?clientId=&days=30
 *   — Revenue, units, sessions per ASIN from business_report rows
 *
 * GET /api/ingested/campaigns?clientId=&days=30
 *   — Spend, sales, ACoS, etc. per campaign from ppc rows
 *
 * GET /api/ingested/wasted-keywords?clientId=&days=30
 *   — Search terms with zero orders from search_terms/ppc rows
 */
import { Router, Request, Response, NextFunction } from "express";
import { query } from "../data/db";

const router = Router();

// ── GET /api/ingested/products ─────────────────────────────────────────────
router.get("/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = Number(req.query.clientId);
    if (!clientId) {
      res.status(400).json({ success: false, error: { message: "clientId required", code: "MISSING_CLIENT_ID" } });
      return;
    }
    const days = Math.min(Number(req.query.days) || 30, 365);

    const result = await query<{
      asin: string;
      title: string;
      revenue: string;
      units_ordered: string;
      sessions: string;
      page_views: string;
      buy_box_pct: string;
      unit_session_pct: string;
    }>(
      `SELECT
        asin,
        MAX(product_title)          AS title,
        SUM(revenue)                AS revenue,
        SUM(units_ordered)          AS units_ordered,
        SUM(sessions)               AS sessions,
        SUM(page_views)             AS page_views,
        AVG(buy_box_pct)            AS buy_box_pct,
        AVG(unit_session_pct)       AS unit_session_pct
       FROM ingested_rows
       WHERE report_type = 'business_report'
         AND client_id = $1
         AND asin IS NOT NULL
         AND report_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       GROUP BY asin
       ORDER BY revenue DESC NULLS LAST
       LIMIT 50`,
      [clientId, days]
    );

    const totalRevenue = result.rows.reduce((s, r) => s + Number(r.revenue || 0), 0);

    const data = result.rows.map((r) => ({
      asin: r.asin,
      title: r.title || r.asin,
      revenue: Number(r.revenue || 0),
      units_ordered: Number(r.units_ordered || 0),
      sessions: Number(r.sessions || 0),
      page_views: Number(r.page_views || 0),
      buy_box_pct: Number(r.buy_box_pct || 0),
      unit_session_pct: Number(r.unit_session_pct || 0),
      share_pct: totalRevenue > 0
        ? Math.round((Number(r.revenue || 0) / totalRevenue) * 1000) / 10
        : 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/ingested/campaigns ────────────────────────────────────────────
router.get("/campaigns", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = Number(req.query.clientId);
    if (!clientId) {
      res.status(400).json({ success: false, error: { message: "clientId required", code: "MISSING_CLIENT_ID" } });
      return;
    }
    const days = Math.min(Number(req.query.days) || 30, 365);

    const result = await query<{
      campaign_name: string;
      impressions: string;
      clicks: string;
      ad_spend: string;
      ad_sales: string;
      ad_orders: string;
    }>(
      `SELECT
        campaign_name,
        SUM(impressions)  AS impressions,
        SUM(clicks)       AS clicks,
        SUM(ad_spend)     AS ad_spend,
        SUM(ad_sales)     AS ad_sales,
        SUM(ad_orders)    AS ad_orders
       FROM ingested_rows
       WHERE report_type = 'ppc'
         AND client_id = $1
         AND campaign_name IS NOT NULL
         AND report_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       GROUP BY campaign_name
       ORDER BY ad_spend DESC NULLS LAST
       LIMIT 50`,
      [clientId, days]
    );

    const data = result.rows.map((r) => {
      const spend = Number(r.ad_spend || 0);
      const sales = Number(r.ad_sales || 0);
      const clicks = Number(r.clicks || 0);
      const impressions = Number(r.impressions || 0);
      const orders = Number(r.ad_orders || 0);
      const acos = sales > 0 ? Math.round((spend / sales) * 10000) / 100 : 0;
      const roas = spend > 0 ? Math.round((sales / spend) * 100) / 100 : 0;
      const ctr  = impressions > 0 ? Math.round((clicks / impressions) * 100000) / 1000 : 0;
      const cpc  = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
      const cvr  = clicks > 0 ? Math.round((orders / clicks) * 10000) / 100 : 0;
      const status = acos === 0 ? "no_sales" : acos < 15 ? "healthy" : acos < 25 ? "warning" : "critical";

      return { campaign_name: r.campaign_name, impressions, clicks, ad_spend: spend, ad_sales: sales, ad_orders: orders, acos, roas, ctr, cpc, cvr, status };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/ingested/wasted-keywords ──────────────────────────────────────
router.get("/wasted-keywords", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = Number(req.query.clientId);
    if (!clientId) {
      res.status(400).json({ success: false, error: { message: "clientId required", code: "MISSING_CLIENT_ID" } });
      return;
    }
    const days = Math.min(Number(req.query.days) || 30, 365);

    const result = await query<{
      term: string;
      spend: string;
      clicks: string;
      orders: string;
    }>(
      `SELECT
        COALESCE(customer_search_term, keyword) AS term,
        SUM(ad_spend)  AS spend,
        SUM(clicks)    AS clicks,
        SUM(ad_orders) AS orders
       FROM ingested_rows
       WHERE client_id = $1
         AND (report_type = 'search_terms' OR report_type = 'ppc')
         AND (customer_search_term IS NOT NULL OR keyword IS NOT NULL)
         AND report_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       GROUP BY COALESCE(customer_search_term, keyword)
       HAVING SUM(ad_orders) = 0 AND SUM(ad_spend) > 5
       ORDER BY spend DESC
       LIMIT 20`,
      [clientId, days]
    );

    const data = result.rows.map((r) => ({
      term: r.term,
      spend: Number(r.spend || 0),
      clicks: Number(r.clicks || 0),
      orders: 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
