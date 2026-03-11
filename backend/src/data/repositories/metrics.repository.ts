/**
 * Data Layer — Metrics Repository
 * Owns all SQL for metrics-related data access.
 */
import { query } from "../db";

export interface OverviewRow {
  total_revenue: number;
  total_orders: number;
  total_ad_spend: number;
  active_clients: number;
  prev_revenue: number;
  prev_orders: number;
  prev_ad_spend: number;
}

export interface RevenueTrendRow {
  date: string;
  revenue: number;
  orders: number;
  ad_spend: number;
}

export interface TopProductRow {
  asin: string;
  title: string;
  revenue: number;
  units_sold: number;
  share_pct: number;
}

export const metricsRepository = {
  async getOverview(clientId?: number): Promise<OverviewRow | null> {
    const clientFilter = clientId ? "WHERE client_id = $1" : "";
    const params = clientId ? [clientId] : [];

    const sql = `
      WITH current AS (
        SELECT
          COALESCE(SUM(revenue), 0)   AS total_revenue,
          COALESCE(SUM(orders), 0)    AS total_orders,
          COALESCE(SUM(ad_spend), 0)  AS total_ad_spend
        FROM daily_metrics
        ${clientFilter}
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      ),
      previous AS (
        SELECT
          COALESCE(SUM(revenue), 0)  AS prev_revenue,
          COALESCE(SUM(orders), 0)   AS prev_orders,
          COALESCE(SUM(ad_spend), 0) AS prev_ad_spend
        FROM daily_metrics
        ${clientFilter ? clientFilter + " AND" : "WHERE"}
        date >= CURRENT_DATE - INTERVAL '60 days'
        AND date < CURRENT_DATE - INTERVAL '30 days'
      ),
      clients AS (
        SELECT COUNT(*) AS active_clients FROM clients WHERE status = 'active'
      )
      SELECT c.*, p.*, cl.active_clients
      FROM current c, previous p, clients cl
    `;

    const result = await query<OverviewRow>(sql, params);
    return result.rows[0] ?? null;
  },

  async getRevenueTrend(days = 30, clientId?: number): Promise<RevenueTrendRow[]> {
    const params: unknown[] = [days];
    const clientFilter = clientId ? `AND client_id = $2` : "";
    if (clientId) params.push(clientId);

    const sql = `
      SELECT
        date::text,
        COALESCE(SUM(revenue), 0)  AS revenue,
        COALESCE(SUM(orders), 0)   AS orders,
        COALESCE(SUM(ad_spend), 0) AS ad_spend
      FROM daily_metrics
      WHERE date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      ${clientFilter}
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await query<RevenueTrendRow>(sql, params);
    return result.rows;
  },

  async getTopProducts(limit = 10, clientId?: number): Promise<TopProductRow[]> {
    const params: unknown[] = [limit];
    const clientFilter = clientId ? `AND pm.client_id = $2` : "";
    if (clientId) params.push(clientId);

    const sql = `
      WITH totals AS (
        SELECT SUM(revenue) AS grand_total
        FROM product_metrics pm
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        ${clientFilter}
      )
      SELECT
        p.asin,
        p.title,
        COALESCE(SUM(pm.revenue), 0)     AS revenue,
        COALESCE(SUM(pm.units_sold), 0)  AS units_sold,
        ROUND(
          COALESCE(SUM(pm.revenue), 0) / NULLIF(t.grand_total, 0) * 100, 1
        )                                AS share_pct
      FROM products p
      JOIN product_metrics pm ON pm.product_id = p.id
      CROSS JOIN totals t
      WHERE pm.date >= CURRENT_DATE - INTERVAL '30 days'
      ${clientFilter}
      GROUP BY p.asin, p.title, t.grand_total
      ORDER BY revenue DESC
      LIMIT $1
    `;

    const result = await query<TopProductRow>(sql, params);
    return result.rows;
  },
};
