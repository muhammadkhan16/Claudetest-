/**
 * Demo data for BestLife4Pets and Numa Foods
 * Used when no real Amazon data has been uploaded yet.
 * Mirrors the exact shape of the localStore data so all pages
 * work identically once a real Amazon account is connected.
 */

import type { BusinessRow, PpcRow, SearchTermRow } from "./local-store";

// ── Date helpers ────────────────────────────────────────────────────────────

/** Generate last N days of dates ending yesterday */
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date("2026-04-04");
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

const DATES = lastNDays(30);

/** Day multiplier: weekends slightly lower, growth trend over period */
function dayFactor(dateStr: string, i: number): number {
  const d = new Date(dateStr);
  const dow = d.getDay(); // 0=Sun, 6=Sat
  const weekend = dow === 0 || dow === 6 ? 0.72 : 1.0;
  const growth = 1 + (i / 30) * 0.18;
  const wave = 1 + Math.sin(i * 0.7 + 1.1) * 0.12;
  return weekend * growth * wave;
}

// ── BestLife4Pets ───────────────────────────────────────────────────────────

const BL4P_PRODUCTS = [
  { asin: "B08K3XZPVR", title: "BestLife4Pets Advanced Fish Oil Omega-3 — Dogs & Cats 180 Softgels",  dailyRev: 297.3, dailySessions: 41, dailyUnits: 10.4, buyBox: 0.97, cvr: 0.25 },
  { asin: "B07XK8FBLQ", title: "BestLife4Pets Complete Dog Multivitamin 120 Chews — All Breeds",       dailyRev: 248.3, dailySessions: 32, dailyUnits: 8.3,  buyBox: 0.99, cvr: 0.26 },
  { asin: "B09LVMZX4T", title: "BestLife4Pets Hip & Joint Support — Glucosamine + Chondroitin 90ct",  dailyRev: 207.7, dailySessions: 25, dailyUnits: 6.3,  buyBox: 0.95, cvr: 0.25 },
  { asin: "B08H7YQPLM", title: "BestLife4Pets Probiotic for Dogs 120 Chews — Gut Health Formula",     dailyRev: 163.0, dailySessions: 18, dailyUnits: 5.2,  buyBox: 0.98, cvr: 0.29 },
  { asin: "B0BK9FZQST", title: "BestLife4Pets Senior Dog Bundle — Joint, Probiotic & Multivitamin",   dailyRev: 126.0, dailySessions: 13, dailyUnits: 3.3,  buyBox: 1.00, cvr: 0.25 },
  { asin: "B07MNXQVBR", title: "BestLife4Pets Cat Dental Health Treats — Chicken & Mint 60 Count",   dailyRev:  88.0, dailySessions:  9, dailyUnits:  2.9, buyBox: 0.94, cvr: 0.32 },
];

const BL4P_CAMPAIGNS = [
  { name: "SP | Fish Oil | Exact | Brand",      dailySpend: 16.0, dailySales: 74.7,  dailyImpr: 613, dailyClicks: 11.4, dailyOrders: 2.4 },
  { name: "SP | Dog Vitamins | Auto | Scale",   dailySpend: 20.7, dailySales: 96.3,  dailyImpr: 820, dailyClicks: 14.3, dailyOrders: 2.0 },
  { name: "SP | Joint Support | Broad | Comp",  dailySpend: 13.0, dailySales: 55.0,  dailyImpr: 1040, dailyClicks: 9.9, dailyOrders: 1.4 },
  { name: "SP | Probiotics | Exact | KW",       dailySpend: 10.3, dailySales: 47.3,  dailyImpr: 427, dailyClicks: 7.3,  dailyOrders: 1.3 },
  { name: "SB | BestLife4Pets Brand Defense",   dailySpend: 18.0, dailySales: 107.0, dailyImpr: 1520, dailyClicks: 20.4, dailyOrders: 2.8 },
  { name: "SP | Senior Bundle | Auto",          dailySpend:  9.3, dailySales: 39.3,  dailyImpr: 297, dailyClicks:  5.5, dailyOrders: 1.0 },
  { name: "SD | Retargeting | All ASINs",       dailySpend:  9.7, dailySales: 32.7,  dailyImpr: 2067, dailyClicks: 4.9, dailyOrders: 0.9 },
];

const BL4P_SEARCH_TERMS = [
  { term: "fish oil for dogs", dailySpend: 4.2, dailyClicks: 8, dailyOrders: 1.1 },
  { term: "dog joint supplement glucosamine", dailySpend: 3.8, dailyClicks: 7, dailyOrders: 0.9 },
  { term: "dog multivitamin chews", dailySpend: 3.1, dailyClicks: 6, dailyOrders: 0.8 },
  { term: "probiotics for dogs", dailySpend: 2.9, dailyClicks: 5, dailyOrders: 0.7 },
  // Wasted — spend but 0 orders
  { term: "dog treats organic", dailySpend: 1.8, dailyClicks: 4, dailyOrders: 0 },
  { term: "pet supplements chewy", dailySpend: 1.2, dailyClicks: 3, dailyOrders: 0 },
  { term: "fish oil walmart dogs", dailySpend: 0.9, dailyClicks: 2, dailyOrders: 0 },
];

// ── Numa Foods ──────────────────────────────────────────────────────────────

const NUMA_PRODUCTS = [
  { asin: "B09TQLRXMP", title: "Numa Foods Organic Granola Bars — Honey Oat 12-Pack",            dailyRev: 273.3, dailySessions: 36, dailyUnits: 14.4, buyBox: 0.98, cvr: 0.40 },
  { asin: "B08XZKFQMN", title: "Numa Foods Trail Mix Snack Pack — Mixed Nuts & Berries 18ct",    dailyRev: 230.0, dailySessions: 28, dailyUnits: 9.2,  buyBox: 0.97, cvr: 0.33 },
  { asin: "B0BKZWTQRX", title: "Numa Foods Almond Butter Squeeze Packs — No Added Sugar 10ct",  dailyRev: 186.7, dailySessions: 22, dailyUnits: 11.0, buyBox: 1.00, cvr: 0.50 },
  { asin: "B09WNQVMZL", title: "Numa Foods High-Protein Energy Balls — Chocolate Peanut 20ct",  dailyRev: 140.0, dailySessions: 17, dailyUnits: 6.1,  buyBox: 0.96, cvr: 0.36 },
  { asin: "B07QRMZXVB", title: "Numa Foods Superfood Seed Mix — Chia, Flax & Hemp 1lb",         dailyRev:  86.7, dailySessions: 11, dailyUnits: 5.8,  buyBox: 0.99, cvr: 0.53 },
];

const NUMA_CAMPAIGNS = [
  { name: "SP | Granola Bars | Exact | Brand",  dailySpend: 12.7, dailySales: 56.0,  dailyImpr: 480, dailyClicks: 9.8,  dailyOrders: 2.2 },
  { name: "SP | Trail Mix | Auto | Scale",      dailySpend: 14.0, dailySales: 64.0,  dailyImpr: 610, dailyClicks: 11.3, dailyOrders: 2.0 },
  { name: "SP | Almond Butter | KW | Broad",    dailySpend: 10.3, dailySales: 44.0,  dailyImpr: 390, dailyClicks:  7.4, dailyOrders: 1.4 },
  { name: "SB | Numa Foods Brand Defense",      dailySpend: 15.0, dailySales: 88.3,  dailyImpr: 1140, dailyClicks: 18.2, dailyOrders: 2.6 },
  { name: "SP | Protein Balls | Auto",          dailySpend:  8.7, dailySales: 35.7,  dailyImpr: 304, dailyClicks:  5.8, dailyOrders: 1.0 },
  { name: "SD | Retargeting | All SKUs",        dailySpend:  7.3, dailySales: 24.7,  dailyImpr: 1740, dailyClicks: 4.2, dailyOrders: 0.7 },
];

const NUMA_SEARCH_TERMS = [
  { term: "organic granola bars healthy", dailySpend: 3.6, dailyClicks: 7, dailyOrders: 1.0 },
  { term: "trail mix snack packs bulk", dailySpend: 3.1, dailyClicks: 6, dailyOrders: 0.8 },
  { term: "almond butter squeeze packs", dailySpend: 2.8, dailyClicks: 5, dailyOrders: 0.7 },
  { term: "healthy snacks protein bars", dailySpend: 2.4, dailyClicks: 4, dailyOrders: 0.6 },
  // Wasted
  { term: "granola bars walmart", dailySpend: 1.6, dailyClicks: 3, dailyOrders: 0 },
  { term: "organic snacks costco", dailySpend: 1.1, dailyClicks: 2, dailyOrders: 0 },
  { term: "trail mix chewy subscription", dailySpend: 0.8, dailyClicks: 2, dailyOrders: 0 },
];

// ── Generator ────────────────────────────────────────────────────────────────

function r(n: number) { return Math.round(n * 100) / 100; }

function buildBusinessRows(
  products: typeof BL4P_PRODUCTS
): BusinessRow[] {
  const rows: BusinessRow[] = [];
  DATES.forEach((date, i) => {
    const f = dayFactor(date, i);
    for (const p of products) {
      const sessions = Math.max(1, Math.round(p.dailySessions * f));
      const units    = Math.max(1, Math.round(p.dailyUnits * f));
      rows.push({
        report_date:      date,
        asin:             p.asin,
        product_title:    p.title,
        sessions,
        page_views:       Math.round(sessions * 1.28),
        buy_box_pct:      p.buyBox,
        units_ordered:    units,
        revenue:          r(p.dailyRev * f),
        unit_session_pct: p.cvr,
      });
    }
  });
  return rows;
}

function buildPpcRows(
  campaigns: typeof BL4P_CAMPAIGNS
): PpcRow[] {
  const rows: PpcRow[] = [];
  DATES.forEach((date, i) => {
    const f = dayFactor(date, i);
    for (const c of campaigns) {
      const spend  = r(c.dailySpend  * f);
      const sales  = r(c.dailySales  * f);
      const impr   = Math.max(1, Math.round(c.dailyImpr   * f));
      const clicks = Math.max(1, Math.round(c.dailyClicks * f));
      const orders = Math.max(0, Math.round(c.dailyOrders * f));
      rows.push({
        report_date:   date,
        campaign_name: c.name,
        ad_group_name: "Default Ad Group",
        keyword:       "",
        match_type:    "auto",
        impressions:   impr,
        clicks,
        ad_spend:      spend,
        ad_sales:      sales,
        ad_orders:     orders,
        ad_units:      orders,
        acos:          sales  > 0 ? spend / sales      : 0,
        ctr:           impr   > 0 ? clicks / impr      : 0,
        cpc:           clicks > 0 ? spend / clicks     : 0,
        roas:          spend  > 0 ? sales  / spend     : 0,
      });
    }
  });
  return rows;
}

function buildSearchTermRows(
  terms: typeof BL4P_SEARCH_TERMS
): SearchTermRow[] {
  const rows: SearchTermRow[] = [];
  DATES.forEach((date, i) => {
    const f = dayFactor(date, i);
    for (const t of terms) {
      rows.push({
        report_date:   date,
        term:          t.term,
        campaign_name: "Auto Campaign",
        impressions:   Math.max(1, Math.round(t.dailyClicks * 12 * f)),
        clicks:        Math.max(0, Math.round(t.dailyClicks * f)),
        ad_spend:      r(t.dailySpend * f),
        ad_orders:     Math.round(t.dailyOrders * f),
      });
    }
  });
  return rows;
}

// ── Exports ──────────────────────────────────────────────────────────────────

export type DemoBrand = "bestlife4pets" | "numa-foods";

export const DEMO_BRANDS: Record<DemoBrand, { name: string; color: string; emoji: string }> = {
  "bestlife4pets": { name: "BestLife4Pets", color: "#059669", emoji: "🐾" },
  "numa-foods":    { name: "Numa Foods",    color: "#D97706", emoji: "🌿" },
};

export interface DemoDataSet {
  business_rows: BusinessRow[];
  ppc_rows: PpcRow[];
  search_term_rows: SearchTermRow[];
}

let _cache: Partial<Record<DemoBrand, DemoDataSet>> = {};

export function getDemoData(brand: DemoBrand): DemoDataSet {
  if (_cache[brand]) return _cache[brand]!;
  const data: DemoDataSet =
    brand === "bestlife4pets"
      ? {
          business_rows:    buildBusinessRows(BL4P_PRODUCTS),
          ppc_rows:         buildPpcRows(BL4P_CAMPAIGNS),
          search_term_rows: buildSearchTermRows(BL4P_SEARCH_TERMS),
        }
      : {
          business_rows:    buildBusinessRows(NUMA_PRODUCTS),
          ppc_rows:         buildPpcRows(NUMA_CAMPAIGNS),
          search_term_rows: buildSearchTermRows(NUMA_SEARCH_TERMS),
        };
  _cache[brand] = data;
  return data;
}
