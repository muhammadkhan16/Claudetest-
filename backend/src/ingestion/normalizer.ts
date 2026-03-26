/**
 * Data Normalizer
 *
 * Maps inconsistent Amazon CSV headers to a unified internal schema.
 * Amazon changes column names across report versions, locales, and date ranges.
 * This module absorbs all that variation.
 */

// ── Unified row shape ──────────────────────────────────────────────────────

export interface UnifiedRow {
  report_date: Date;

  // Product
  asin?: string;
  parent_asin?: string;
  product_title?: string;

  // Traffic
  sessions?: number;
  session_pct?: number;
  page_views?: number;
  page_view_pct?: number;
  buy_box_pct?: number;

  // Sales
  units_ordered?: number;
  units_ordered_b2b?: number;
  revenue?: number;
  revenue_b2b?: number;
  order_items?: number;
  unit_session_pct?: number;

  // Campaign context
  campaign_name?: string;
  ad_group_name?: string;
  keyword?: string;
  match_type?: string;
  customer_search_term?: string;
  targeting_expression?: string;

  // Advertising metrics
  impressions?: number;
  clicks?: number;
  ad_spend?: number;
  ad_sales?: number;
  ad_orders?: number;
  ad_units?: number;
  ctr?: number;
  cpc?: number;
  acos?: number;
  conversion_rate?: number;
}

export type ReportType = "business_report" | "ppc" | "search_terms";

// ── Header alias maps ──────────────────────────────────────────────────────
// Each entry: canonical key → array of known Amazon header variants (lowercased, trimmed)

const HEADER_ALIASES: Record<keyof UnifiedRow, string[]> = {
  report_date: ["date", "report date", "day"],

  // Product
  asin: ["(child) asin", "child asin", "asin", "advertised asin", "product asin"],
  parent_asin: ["(parent) asin", "parent asin"],
  product_title: ["title", "product name", "product title", "advertised sku"],

  // Traffic
  sessions: ["sessions", "session – total", "sessions - total", "sessions total"],
  session_pct: ["session percentage", "sessions percentage", "session % of total"],
  page_views: ["page views", "page views – total", "page views - total", "page views total"],
  page_view_pct: ["page views percentage", "page views percentage – total"],
  buy_box_pct: ["buy box percentage", "featured offer (buy box) percentage", "buy box %"],

  // Sales
  units_ordered: ["units ordered", "units ordered - total", "units ordered – total"],
  units_ordered_b2b: ["units ordered - b2b", "units ordered – b2b"],
  revenue: [
    "ordered product sales",
    "ordered product sales – total",
    "ordered product sales - total",
    "sales",
    "7 day total sales",
    "14 day total sales",
    "total advertising sales",
  ],
  revenue_b2b: ["ordered product sales - b2b", "ordered product sales – b2b"],
  order_items: ["total order items", "total order items – total", "total order items - total"],
  unit_session_pct: ["unit session percentage", "unit session percentage – total"],

  // Campaign context
  campaign_name: ["campaign name", "campaign"],
  ad_group_name: ["ad group name", "ad group"],
  keyword: ["keyword", "keyword text", "targeted keyword", "targeting"],
  match_type: ["match type", "keyword match type"],
  customer_search_term: ["customer search term", "search term"],
  targeting_expression: ["targeting expression", "targeting", "product targeting"],

  // Advertising metrics
  impressions: ["impressions", "ad impressions"],
  clicks: ["clicks", "ad clicks"],
  ad_spend: [
    "spend",
    "cost",
    "ad spend",
    "total spend",
    "7 day total spend",
    "14 day total spend",
  ],
  ad_sales: [
    "sales",
    "7 day total sales",
    "14 day total sales",
    "total sales",
    "attributed sales (total)",
  ],
  ad_orders: [
    "orders",
    "7 day total orders (#)",
    "14 day total orders (#)",
    "total orders",
    "attributed conversions (total)",
  ],
  ad_units: ["units", "7 day total units (#)", "14 day total units (#)"],
  ctr: ["click-thru rate (ctr)", "ctr", "click through rate"],
  cpc: ["cost per click (cpc)", "cpc", "cost-per-click"],
  acos: ["advertising cost of sales (acos)", "acos", "total acos"],
  conversion_rate: ["conversion rate", "cvr", "order rate"],
};

// Build reverse lookup: lowercased alias → canonical key
const REVERSE_MAP = new Map<string, keyof UnifiedRow>();
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) {
    REVERSE_MAP.set(alias.toLowerCase().trim(), canonical as keyof UnifiedRow);
  }
}

// ── Normalizer class ───────────────────────────────────────────────────────

export class DataNormalizer {
  /**
   * Detect which report type this CSV is by inspecting its headers.
   */
  detectReportType(headers: string[]): ReportType {
    const normalized = headers.map((h) => h.toLowerCase().trim());
    const has = (term: string) =>
      normalized.some((h) => h.includes(term));

    if (has("customer search term") || has("search term")) return "search_terms";
    if (has("campaign name") || has("campaign") || has("acos")) return "ppc";
    return "business_report";
  }

  /**
   * Build a column index: canonical field name → CSV column index.
   * Handles unknown headers gracefully (ignored).
   */
  buildColumnIndex(headers: string[]): Map<keyof UnifiedRow, number> {
    const index = new Map<keyof UnifiedRow, number>();
    headers.forEach((raw, i) => {
      const key = REVERSE_MAP.get(raw.toLowerCase().trim());
      if (key && !index.has(key)) {
        index.set(key, i);
      }
    });
    return index;
  }

  /**
   * Normalize a single CSV row (array of string values) using the column index.
   */
  normalizeRow(
    values: string[],
    colIndex: Map<keyof UnifiedRow, number>
  ): UnifiedRow | null {
    const get = (key: keyof UnifiedRow): string | undefined => {
      const idx = colIndex.get(key);
      return idx !== undefined ? values[idx]?.trim() : undefined;
    };

    const dateStr = get("report_date");
    if (!dateStr) return null;

    const report_date = this.parseDate(dateStr);
    if (!report_date) return null;

    return {
      report_date,
      asin:                 this.cleanAsin(get("asin")),
      parent_asin:          this.cleanAsin(get("parent_asin")),
      product_title:        get("product_title") || undefined,
      sessions:             this.int(get("sessions")),
      session_pct:          this.pct(get("session_pct")),
      page_views:           this.int(get("page_views")),
      page_view_pct:        this.pct(get("page_view_pct")),
      buy_box_pct:          this.pct(get("buy_box_pct")),
      units_ordered:        this.int(get("units_ordered")),
      units_ordered_b2b:    this.int(get("units_ordered_b2b")),
      revenue:              this.money(get("revenue")),
      revenue_b2b:          this.money(get("revenue_b2b")),
      order_items:          this.int(get("order_items")),
      unit_session_pct:     this.pct(get("unit_session_pct")),
      campaign_name:        get("campaign_name") || undefined,
      ad_group_name:        get("ad_group_name") || undefined,
      keyword:              get("keyword") || undefined,
      match_type:           get("match_type") || undefined,
      customer_search_term: get("customer_search_term") || undefined,
      targeting_expression: get("targeting_expression") || undefined,
      impressions:          this.int(get("impressions")),
      clicks:               this.int(get("clicks")),
      ad_spend:             this.money(get("ad_spend")),
      ad_sales:             this.money(get("ad_sales")),
      ad_orders:            this.int(get("ad_orders")),
      ad_units:             this.int(get("ad_units")),
      ctr:                  this.decimal(get("ctr")),
      cpc:                  this.money(get("cpc")),
      acos:                 this.pct(get("acos")),
      conversion_rate:      this.decimal(get("conversion_rate")),
    };
  }

  // ── Type coercers ──────────────────────────────────────────────────────

  private parseDate(s: string): Date | null {
    // Handles: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, Month D, YYYY
    const cleaned = s.replace(/"/g, "").trim();
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  private cleanAsin(s?: string): string | undefined {
    if (!s) return undefined;
    const cleaned = s.replace(/"/g, "").trim().toUpperCase();
    return /^B[A-Z0-9]{9}$/.test(cleaned) ? cleaned : undefined;
  }

  private int(s?: string): number | undefined {
    if (!s) return undefined;
    const n = parseInt(s.replace(/[^0-9-]/g, ""), 10);
    return isNaN(n) ? undefined : n;
  }

  private money(s?: string): number | undefined {
    if (!s) return undefined;
    const n = parseFloat(s.replace(/[$,\s"]/g, ""));
    return isNaN(n) ? undefined : n;
  }

  private pct(s?: string): number | undefined {
    if (!s) return undefined;
    // Could be "12.5%" or "0.125" — normalize to decimal fraction
    const cleaned = s.replace(/[%,\s"]/g, "");
    const n = parseFloat(cleaned);
    if (isNaN(n)) return undefined;
    return s.includes("%") ? n / 100 : n;
  }

  private decimal(s?: string): number | undefined {
    if (!s) return undefined;
    const cleaned = s.replace(/[%,\s"]/g, "");
    const n = parseFloat(cleaned);
    if (isNaN(n)) return undefined;
    // CTR/CVR from Amazon can be "2.43%" → 0.0243 or just "0.0243"
    return s.includes("%") ? n / 100 : n;
  }
}

export const normalizer = new DataNormalizer();
