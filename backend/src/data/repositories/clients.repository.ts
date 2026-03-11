/**
 * Data Layer — Clients Repository
 */
import { query } from "../db";

export interface Client {
  id: number;
  name: string;
  email: string;
  marketplace: string;
  status: "active" | "inactive" | "trial";
  monthly_budget: number;
  created_at: string;
}

export interface ClientAuditRow {
  client_id: number;
  client_name: string;
  marketplace: string;
  revenue_30d: number;
  ad_spend_30d: number;
  acos: number;
  orders_30d: number;
  active_products: number;
  health_score: number;
}

export const clientsRepository = {
  async findAll(): Promise<Client[]> {
    const result = await query<Client>(
      `SELECT * FROM clients ORDER BY name ASC`
    );
    return result.rows;
  },

  async findById(id: number): Promise<Client | null> {
    const result = await query<Client>(
      `SELECT * FROM clients WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async getAuditSummary(): Promise<ClientAuditRow[]> {
    const sql = `
      SELECT
        c.id            AS client_id,
        c.name          AS client_name,
        c.marketplace,
        COALESCE(SUM(dm.revenue), 0)           AS revenue_30d,
        COALESCE(SUM(dm.ad_spend), 0)          AS ad_spend_30d,
        COALESCE(
          SUM(dm.ad_spend) / NULLIF(SUM(dm.revenue), 0) * 100, 0
        )                                      AS acos,
        COALESCE(SUM(dm.orders), 0)            AS orders_30d,
        COUNT(DISTINCT p.id)                   AS active_products,
        -- Health score: 100 - penalty for high ACoS and low conversion
        GREATEST(0, LEAST(100,
          100
          - GREATEST(0, (COALESCE(SUM(dm.ad_spend)/NULLIF(SUM(dm.revenue),0)*100,0) - 20))
          + CASE WHEN COALESCE(SUM(dm.revenue), 0) > 10000 THEN 10 ELSE 0 END
        ))::int                                AS health_score
      FROM clients c
      LEFT JOIN daily_metrics dm
        ON dm.client_id = c.id
        AND dm.date >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN products p
        ON p.client_id = c.id AND p.status = 'active'
      WHERE c.status = 'active'
      GROUP BY c.id, c.name, c.marketplace
      ORDER BY revenue_30d DESC
    `;
    const result = await query<ClientAuditRow>(sql);
    return result.rows;
  },
};
