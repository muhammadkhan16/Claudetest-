/**
 * Local data store — persists uploaded CSV data in localStorage.
 * Used when the backend API is not available (Cloudflare Pages deployment).
 */

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
  acos: number;
  ctr: number;
  cpc: number;
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
  lastUpdated: string;
}

const KEY = "amzsuite_data";

function load(): LocalStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : empty();
  } catch {
    return empty();
  }
}

function empty(): LocalStore {
  return { business_rows: [], ppc_rows: [], search_term_rows: [], uploads: [], lastUpdated: "" };
}

function save(store: LocalStore) {
  if (typeof window === "undefined") return;
  store.lastUpdated = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(store));
}

export const localStore = {
  addUpload(upload: LocalUpload, rows: unknown[], reportType: string) {
    const store = load();

    // Remove old rows from same upload (idempotent re-uploads)
    if (reportType === "business_report") {
      store.business_rows = [...store.business_rows, ...(rows as BusinessRow[])];
    } else if (reportType === "ppc") {
      store.ppc_rows = [...store.ppc_rows, ...(rows as PpcRow[])];
    } else if (reportType === "search_terms") {
      store.search_term_rows = [...store.search_term_rows, ...(rows as SearchTermRow[])];
    }

    // Prepend to uploads list
    store.uploads = [upload, ...store.uploads].slice(0, 50);
    save(store);
  },

  getUploads(): LocalUpload[] {
    return load().uploads;
  },

  hasData(): boolean {
    const s = load();
    return s.business_rows.length > 0 || s.ppc_rows.length > 0;
  },

  /** Aggregate business rows → IngestedProduct[] shape */
  getProducts() {
    const { business_rows } = load();
    const map = new Map<string, {
      asin: string; title: string; revenue: number; units_ordered: number;
      sessions: number; page_views: number; buy_box_sum: number; cvr_sum: number; count: number;
    }>();

    for (const row of business_rows) {
      if (!row.asin) continue;
      const existing = map.get(row.asin);
      if (existing) {
        existing.revenue += row.revenue;
        existing.units_ordered += row.units_ordered;
        existing.sessions += row.sessions;
        existing.page_views += row.page_views;
        existing.buy_box_sum += row.buy_box_pct;
        existing.cvr_sum += row.unit_session_pct;
        existing.count++;
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
      revenue: p.revenue,
      units_ordered: p.units_ordered,
      sessions: p.sessions,
      page_views: p.page_views,
      buy_box_pct: p.count > 0 ? p.buy_box_sum / p.count : 0,
      unit_session_pct: p.count > 0 ? p.cvr_sum / p.count : 0,
      share_pct: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
    }));
  },

  /** Aggregate PPC rows → IngestedCampaign[] shape */
  getCampaigns() {
    const { ppc_rows } = load();
    const map = new Map<string, {
      impressions: number; clicks: number; ad_spend: number; ad_sales: number; ad_orders: number;
    }>();

    for (const row of ppc_rows) {
      if (!row.campaign_name) continue;
      const existing = map.get(row.campaign_name);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.ad_spend += row.ad_spend;
        existing.ad_sales += row.ad_sales;
        existing.ad_orders += row.ad_orders;
      } else {
        map.set(row.campaign_name, {
          impressions: row.impressions,
          clicks: row.clicks,
          ad_spend: row.ad_spend,
          ad_sales: row.ad_sales,
          ad_orders: row.ad_orders,
        });
      }
    }

    return [...map.entries()]
      .sort((a, b) => b[1].ad_spend - a[1].ad_spend)
      .map(([campaign_name, m]) => {
        const acos = m.ad_sales > 0 ? Math.round((m.ad_spend / m.ad_sales) * 10000) / 100 : 0;
        const roas = m.ad_spend > 0 ? Math.round((m.ad_sales / m.ad_spend) * 100) / 100 : 0;
        const ctr  = m.impressions > 0 ? Math.round((m.clicks / m.impressions) * 100000) / 1000 : 0;
        const cpc  = m.clicks > 0 ? Math.round((m.ad_spend / m.clicks) * 100) / 100 : 0;
        const cvr  = m.clicks > 0 ? Math.round((m.ad_orders / m.clicks) * 10000) / 100 : 0;
        const status = acos === 0 ? "no_sales" : acos < 15 ? "healthy" : acos < 25 ? "warning" : "critical";
        return { campaign_name, ...m, acos, roas, ctr, cpc, cvr, status };
      });
  },

  /** Zero-order search terms */
  getWastedKeywords() {
    const { search_term_rows } = load();
    const map = new Map<string, { spend: number; clicks: number; orders: number }>();
    for (const row of search_term_rows) {
      const existing = map.get(row.term);
      if (existing) {
        existing.spend += row.ad_spend;
        existing.clicks += row.clicks;
        existing.orders += row.ad_orders;
      } else {
        map.set(row.term, { spend: row.ad_spend, clicks: row.clicks, orders: row.ad_orders });
      }
    }
    return [...map.entries()]
      .filter(([, v]) => v.orders === 0 && v.spend > 5)
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 20)
      .map(([term, v]) => ({ term, ...v }));
  },

  /** Overview metrics from all local data */
  getOverview() {
    const products = this.getProducts();
    const campaigns = this.getCampaigns();
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalOrders  = products.reduce((s, p) => s + p.units_ordered, 0);
    const totalSpend   = campaigns.reduce((s, c) => s + c.ad_spend, 0);
    const tacos = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;
    return { totalRevenue, totalOrders, totalSpend, tacos };
  },

  /** Build trend points from business rows grouped by date */
  getTrend() {
    const { business_rows, ppc_rows } = load();
    const revByDate = new Map<string, number>();
    const ordByDate = new Map<string, number>();
    for (const row of business_rows) {
      revByDate.set(row.report_date, (revByDate.get(row.report_date) ?? 0) + row.revenue);
      ordByDate.set(row.report_date, (ordByDate.get(row.report_date) ?? 0) + row.units_ordered);
    }
    const spendByDate = new Map<string, number>();
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
