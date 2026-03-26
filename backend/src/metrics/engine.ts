/**
 * Metrics Engine — Orchestrator
 *
 * Decoupled from both the Data Layer and AI Layer.
 * Receives raw data, delegates to calculators, returns enriched metrics.
 */
import {
  calcRevenueMetrics,
  calcACoS,
  calcRoaS,
  calcTACoS,
} from "./calculators/revenue";
import { calcPpcMetrics, recommendBid } from "./calculators/ppc";
import type { OverviewRow, RevenueTrendRow } from "../data/repositories/metrics.repository";

export interface OverviewMetrics {
  revenue: {
    value: number;
    formatted: string;
    change: number;
    changeLabel: string;
    trend: "up" | "down" | "flat";
  };
  orders: {
    value: number;
    change: number;
    changeLabel: string;
    trend: "up" | "down" | "flat";
  };
  adSpend: {
    value: number;
    formatted: string;
    acos: number;
    roas: number;
  };
  activeClients: number;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
  adSpend: number;
  acos: number;
  roas: number;
}

export const metricsEngine = {
  buildOverview(raw: OverviewRow): OverviewMetrics {
    const revMetrics = calcRevenueMetrics({
      current: Number(raw.total_revenue),
      previous: Number(raw.prev_revenue),
    });

    const orderChange =
      raw.prev_orders === 0
        ? 0
        : ((Number(raw.total_orders) - Number(raw.prev_orders)) /
            Number(raw.prev_orders)) *
          100;

    return {
      revenue: {
        value: Number(raw.total_revenue),
        formatted: `$${Number(raw.total_revenue).toLocaleString()}`,
        change: revMetrics.change,
        changeLabel: revMetrics.changeLabel,
        trend: revMetrics.trend,
      },
      orders: {
        value: Number(raw.total_orders),
        change: Math.round(orderChange * 10) / 10,
        changeLabel: `${orderChange >= 0 ? "+" : ""}${orderChange.toFixed(1)}%`,
        trend: orderChange > 0.5 ? "up" : orderChange < -0.5 ? "down" : "flat",
      },
      adSpend: {
        value: Number(raw.total_ad_spend),
        formatted: `$${Number(raw.total_ad_spend).toLocaleString()}`,
        acos: calcACoS(Number(raw.total_ad_spend), Number(raw.total_revenue)),
        roas: calcRoaS(Number(raw.total_revenue), Number(raw.total_ad_spend)),
      },
      activeClients: Number(raw.active_clients),
    };
  },

  buildTrend(rows: RevenueTrendRow[]): TrendPoint[] {
    return rows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      adSpend: Number(r.ad_spend),
      acos: calcACoS(Number(r.ad_spend), Number(r.revenue)),
      roas: calcRoaS(Number(r.revenue), Number(r.ad_spend)),
    }));
  },

  buildPpcAnalysis(raw: {
    impressions: number;
    clicks: number;
    spend: number;
    sales: number;
    orders: number;
    currentBid: number;
    targetAcos: number;
  }) {
    const metrics = calcPpcMetrics(raw);
    const bid = recommendBid(raw.currentBid, metrics.acos, raw.targetAcos);
    return { ...metrics, bidRecommendation: bid };
  },
};
