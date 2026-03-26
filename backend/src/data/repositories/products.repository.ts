/**
 * Data Layer — Products Repository
 */
import { query } from "../db";

export interface Product {
  id: number;
  client_id: number;
  asin: string;
  title: string;
  category: string;
  status: "active" | "inactive" | "suppressed";
  created_at: string;
}

export interface ProductMetricRow {
  asin: string;
  title: string;
  revenue: number;
  units_sold: number;
  conversion_rate: number;
  sessions: number;
  acos: number;
}

export const productsRepository = {
  async findAll(clientId: number): Promise<Product[]> {
    const result = await query<Product>(
      `SELECT * FROM products WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    );
    return result.rows;
  },

  async findByAsin(asin: string): Promise<Product | null> {
    const result = await query<Product>(
      `SELECT * FROM products WHERE asin = $1`,
      [asin]
    );
    return result.rows[0] ?? null;
  },

  async getPerformanceMetrics(clientId: number, days = 30): Promise<ProductMetricRow[]> {
    const sql = `
      SELECT
        p.asin,
        p.title,
        COALESCE(SUM(pm.revenue), 0)           AS revenue,
        COALESCE(SUM(pm.units_sold), 0)        AS units_sold,
        COALESCE(AVG(pm.conversion_rate), 0)   AS conversion_rate,
        COALESCE(SUM(pm.sessions), 0)          AS sessions,
        COALESCE(
          SUM(pm.ad_spend) / NULLIF(SUM(pm.revenue), 0) * 100, 0
        )                                      AS acos
      FROM products p
      JOIN product_metrics pm ON pm.product_id = p.id
      WHERE p.client_id = $1
        AND pm.date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      GROUP BY p.asin, p.title
      ORDER BY revenue DESC
    `;
    const result = await query<ProductMetricRow>(sql, [clientId, days]);
    return result.rows;
  },
};
