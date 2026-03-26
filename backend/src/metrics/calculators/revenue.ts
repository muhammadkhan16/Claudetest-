/**
 * Metrics Engine — Revenue Calculator
 * Pure functions; no DB access. Takes raw data, returns computed metrics.
 */

export interface RevenueSnapshot {
  current: number;
  previous: number;
}

export interface RevenueMetrics {
  value: number;
  change: number;        // percentage change
  changeLabel: string;
  trend: "up" | "down" | "flat";
}

export function calcRevenueMetrics(snap: RevenueSnapshot): RevenueMetrics {
  const change =
    snap.previous === 0
      ? 0
      : ((snap.current - snap.previous) / snap.previous) * 100;

  return {
    value: snap.current,
    change: Math.round(change * 10) / 10,
    changeLabel: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
    trend: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
  };
}

export function calcRoaS(revenue: number, adSpend: number): number {
  if (adSpend === 0) return 0;
  return Math.round((revenue / adSpend) * 100) / 100;
}

export function calcACoS(adSpend: number, revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round((adSpend / revenue) * 10000) / 100; // as percentage
}

export function calcTACoS(totalAdSpend: number, totalRevenue: number): number {
  return calcACoS(totalAdSpend, totalRevenue);
}
