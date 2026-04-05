/**
 * Local data store — persists uploaded CSV/Excel data in localStorage.
 * Falls back to rich demo data (BestLife4Pets or Numa Foods) when no real
 * data has been uploaded. Once an Amazon SP-API account is connected and
 * data is synced, the real data transparently replaces demo data.
 */

import { getDemoData, type DemoBrand } from "./demo-data";

export interface BusinessRow {
  report_date: string;
  asin: string;
  product_title: string;
  sessions: number;
  page_views: number;
  buy_box_pct: number;
  units_ordered: number;
  revenue: number;
  unit_session_pct: number;
}

export interface PpcRow {
  report_date: string;
  campaign_name: string;
  ad_group_name: string;
  keyword: string;
  match_type: string;
  impressions: number;
  clicks: number;
  ad_spend: number;
  ad_sales: number;
  ad_orders: number;
  ad_units: number;
  acos: number;
  ctr: number;
  cpc: number;
  roas: number;
}

export interface SearchTermRow {
  report_date: string;
  term: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  ad_spend: number;
  ad_orders: number;
}

export interface LocalUpload {
  id: string;
  filename: string;
  report_type: string;
  row_count: number;
  date: string;
}

interface LocalStore {
  business_rows: BusinessRow[];
  ppc_rows: PpcRow[];
  search_term_rows: SearchTermRow[];
  uploads: LocalUpload[];
  selected_brand: DemoBrand;
  lastUpdated: string;
}

const KEY        = "amzsuite_data";
const BRAND_KEY  = "amzsuite_brand";

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function load(): LocalStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    const base = raw ? JSON.parse(raw) : empty();
    // Migrate: ensure selected_brand exists
    if (!base.selected_brand) base.selected_brand = "bestlife4pets";
    return base;
  } catch {
    return empty();
  }
}

function empty(): LocalStore {
  return {
    business_rows: [],
    ppc_rows: [],
    search_term_rows: [],
    uploads: [],
    selected_brand: "bestlife4pets",
    lastUpdated: "",
  };
}

function save(store: LocalStore) {
  if (typeof window === "undefined") return;
  store.lastUpdated = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(store));
}

/** True only when real Amazon CSV/Excel data has been uploaded */
function hasRealData(): boolean {
  const s = load();
  return s.business_rows.length > 0 || s.ppc_rows.length > 0;
}

/** Return the rows to use — real data or demo data for the active brand */
function getRows(): { business_rows: BusinessRow[]; ppc_rows: PpcRow[]; search_term_rows: SearchTermRow[] } {
  const s = load();
  if (hasRealData()) return s;
  return getDemoData(s.selected_brand);
}

// ── Aggregation helpers ──────────────────────────────────────────────────────

function aggregateProducts(business_rows: BusinessRow[]) {
  const map = new Map<string, {
    asin: string; title: string; revenue: number; units_ordered: number;
    sessions: number; page_views: number; buy_box_sum: number; cvr_sum: number; count: number;
  }>();

  for (const row of business_rows) {
    if (!row.asin) continue;
    const ex = map.get(row.asin);
    if (ex) {
      ex.revenue       += row.revenue;
      ex.units_ordered += row.units_ordered;
      ex.sessions      += row.sessions;
      ex.page_views    += row.page_views;
      ex.buy_box_sum   += row.buy_box_pct;
      ex.cvr_sum       += row.unit_session_pct;
      ex.count++;
    } else {
      map.set(row.asin, {
        asin: row.asin,
        title: row.product_title || row.asin,
        revenue: row.revenue,
        units_ordered: row.units_ordered,
        sessions: row.sessions,
        page_views: row.page_views,
        buy_box_sum: row.buy_box_pct,
        cvr_sum: row.unit_session_pct,
        count: 1,
      });
    }
  }

  const products = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  return products.map((p) => ({
    asin: p.asin,
    title: p.title,
    revenue: round2(p.revenue),
    units_ordered: p.units_ordered,
    sessions: p.sessions,
    page_views: p.page_views,
    buy_box_pct: p.count > 0 ? round2(p.buy_box_sum / p.count) : 0,
    unit_session_pct: p.count > 0 ? round2(p.cvr_sum / p.count) : 0,
    share_pct: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
  }));
}

function aggregateCampaigns(ppc_rows: PpcRow[]) {
  const map = new Map<string, {
    impressions: number; clicks: number; ad_spend: number; ad_sales: number;
    ad_orders: number; ad_units: number;
  }>();

  for (const row of ppc_rows) {
    if (!row.campaign_name) continue;
    const ex = map.get(row.campaign_name);
    if (ex) {
      ex.impressions += row.impressions;
      ex.clicks      += row.clicks;
      ex.ad_spend    += row.ad_spend;
      ex.ad_sales    += row.ad_sales;
      ex.ad_orders   += row.ad_orders;
      ex.ad_units    += (row.ad_units ?? 0);
    } else {
      map.set(row.campaign_name, {
        impressions: row.impressions,
        clicks:      row.clicks,
        ad_spend:    row.ad_spend,
        ad_sales:    row.ad_sales,
        ad_orders:   row.ad_orders,
        ad_units:    row.ad_units ?? 0,
      });
    }
  }

  return [...map.entries()]
    .sort((a, b) => b[1].ad_spend - a[1].ad_spend)
    .map(([campaign_name, m]) => {
      const acos           = m.ad_sales  > 0 ? round2((m.ad_spend / m.ad_sales) * 100)    : 0;
      const roas           = m.ad_spend  > 0 ? round2(m.ad_sales  / m.ad_spend)            : 0;
      const ctr            = m.impressions > 0 ? round3((m.clicks  / m.impressions) * 100) : 0;
      const cpc            = m.clicks    > 0 ? round2(m.ad_spend   / m.clicks)             : 0;
      const cvr            = m.clicks    > 0 ? round2((m.ad_orders / m.clicks) * 100)      : 0;
      const cost_per_order = m.ad_orders > 0 ? round2(m.ad_spend   / m.ad_orders)          : 0;
      const status = m.ad_sales === 0 ? "no_sales" : acos < 15 ? "healthy" : acos < 25 ? "warning" : "critical";
      return { campaign_name, ...m, acos, roas, ctr, cpc, cvr, cost_per_order, status };
    });
}

function aggregateWasted(search_term_rows: SearchTermRow[]) {
  const map = new Map<string, { spend: number; clicks: number; orders: number }>();
  for (const row of search_term_rows) {
    const ex = map.get(row.term);
    if (ex) {
      ex.spend  += row.ad_spend;
      ex.clicks += row.clicks;
      ex.orders += row.ad_orders;
    } else {
      map.set(row.term, { spend: row.ad_spend, clicks: row.clicks, orders: row.ad_orders });
    }
  }
  return [...map.entries()]
    .filter(([, v]) => v.orders === 0 && v.spend > 5)
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 20)
    .map(([term, v]) => ({ term, ...v }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export const localStore = {
  // ── Brand selector ──────────────────────────────────────────────────────────
  getActiveBrand(): DemoBrand {
    if (typeof window === "undefined") return "bestlife4pets";
    return (localStorage.getItem(BRAND_KEY) as DemoBrand) ?? "bestlife4pets";
  },

  setActiveBrand(brand: DemoBrand) {
    if (typeof window === "undefined") return;
    localStorage.setItem(BRAND_KEY, brand);
    // Update the store record too
    const s = load();
    s.selected_brand = brand;
    save(s);
    // Bust in-memory cache from demo-data
    window.dispatchEvent(new CustomEvent("amzsuite:brand-change", { detail: brand }));
  },

  // ── Upload management ───────────────────────────────────────────────────────
  addUpload(upload: LocalUpload, rows: unknown[], reportType: string) {
    const store = load();
    if (reportType === "business_report") {
      store.business_rows = [...store.business_rows, ...(rows as BusinessRow[])];
    } else if (reportType === "ppc") {
      store.ppc_rows = [...store.ppc_rows, ...(rows as PpcRow[])];
    } else if (reportType === "search_terms") {
      store.search_term_rows = [...store.search_term_rows, ...(rows as SearchTermRow[])];
    }
    store.uploads = [upload, ...store.uploads].slice(0, 50);
    save(store);
  },

  getUploads(): LocalUpload[] {
    return load().uploads;
  },

  /** True when real data has been uploaded (not demo) */
  hasRealData(): boolean {
    return hasRealData();
  },

  /** Always true — demo data is always available */
  hasData(): boolean {
    return true;
  },

  isUsingDemoData(): boolean {
    return !hasRealData();
  },

  // ── Data getters (auto-fallback to demo) ────────────────────────────────────

  getProducts() {
    const { business_rows } = getRows();
    return aggregateProducts(business_rows);
  },

  getCampaigns() {
    const { ppc_rows } = getRows();
    return aggregateCampaigns(ppc_rows);
  },

  getWastedKeywords() {
    const { search_term_rows } = getRows();
    return aggregateWasted(search_term_rows);
  },

  getOverview() {
    const products  = this.getProducts();
    const campaigns = this.getCampaigns();
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalOrders  = products.reduce((s, p) => s + p.units_ordered, 0);
    const totalSpend   = campaigns.reduce((s, c) => s + c.ad_spend, 0);
    const totalSales   = campaigns.reduce((s, c) => s + c.ad_sales, 0);
    const tacos = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;
    const roas  = totalSpend  > 0 ? totalSales   / totalSpend         : 0;
    return { totalRevenue, totalOrders, totalSpend, totalSales, tacos, roas };
  },

  getTrend() {
    const { business_rows, ppc_rows } = getRows();
    const revByDate   = new Map<string, number>();
    const ordByDate   = new Map<string, number>();
    const spendByDate = new Map<string, number>();

    for (const row of business_rows) {
      revByDate.set(row.report_date, (revByDate.get(row.report_date) ?? 0) + row.revenue);
      ordByDate.set(row.report_date, (ordByDate.get(row.report_date) ?? 0) + row.units_ordered);
    }
    for (const row of ppc_rows) {
      spendByDate.set(row.report_date, (spendByDate.get(row.report_date) ?? 0) + row.ad_spend);
    }

    const allDates = [...new Set([...revByDate.keys(), ...spendByDate.keys()])].sort();
    return allDates.map((date) => {
      const revenue = revByDate.get(date) ?? 0;
      const adSpend = spendByDate.get(date) ?? 0;
      return {
        date,
        revenue,
        orders: ordByDate.get(date) ?? 0,
        adSpend,
        acos: revenue > 0 ? (adSpend / revenue) * 100 : 0,
        roas: adSpend > 0 ? revenue / adSpend : 0,
      };
    });
  },

  clear() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
  },
};
