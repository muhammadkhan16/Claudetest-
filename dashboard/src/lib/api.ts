/**
 * Frontend API Client
 * All backend calls go through here — typed, centralized, easy to swap.
 */
import type {
  ApiResponse,
  OverviewMetrics,
  TrendPoint,
  TopProduct,
  Client,
  ClientAudit,
  ListingAnalysis,
  ListingInput,
  PpcAnalysis,
  CampaignInput,
  IntelligenceReport,
  ReasoningChainRequest,
} from "./types";

// Re-export input types used by callers
export type { ListingInput, CampaignInput, ReasoningChainRequest } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message ?? "API error");
  }

  return json.data;
}

// ── Metrics ────────────────────────────────────────────────────────────────

export const metricsApi = {
  getOverview: () =>
    apiFetch<OverviewMetrics>("/metrics/overview"),

  getTrend: (days = 30) =>
    apiFetch<TrendPoint[]>(`/metrics/trend?days=${days}`),

  getTopProducts: (limit = 10) =>
    apiFetch<TopProduct[]>(`/metrics/top-products?limit=${limit}`),
};

// ── Clients ────────────────────────────────────────────────────────────────

export const clientsApi = {
  getAll: () =>
    apiFetch<Client[]>("/clients"),

  getAudit: () =>
    apiFetch<ClientAudit[]>("/clients/audit"),

  getById: (id: number) =>
    apiFetch<Client>(`/clients/${id}`),
};

// ── AI ─────────────────────────────────────────────────────────────────────

// ── Uploads ────────────────────────────────────────────────────────────────

export interface UploadJob {
  id: number;
  client_id: number;
  report_type: "business_report" | "ppc" | "search_terms";
  filename: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  rows_parsed: number;
  rows_inserted: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface UploadJobResult {
  jobId: number;
  reportType: string;
  filename: string;
  status: string;
  message: string;
}

export const uploadsApi = {
  upload: async (file: File, clientId: number, reportType?: string): Promise<UploadJobResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", String(clientId));
    if (reportType) formData.append("type", reportType);
    const res = await fetch(`${BASE_URL}/uploads`, { method: "POST", body: formData });
    const json: ApiResponse<UploadJobResult> = await res.json();
    if (!json.success) throw new Error(json.error?.message ?? "Upload failed");
    return json.data;
  },
  listJobs: (clientId: number) => apiFetch<UploadJob[]>(`/uploads?clientId=${clientId}`),
  getJob: (id: number) => apiFetch<UploadJob>(`/uploads/${id}`),
};

// ── Ingested data (from uploaded CSVs) ────────────────────────────────────

export interface IngestedProduct {
  asin: string;
  title: string;
  revenue: number;
  units_ordered: number;
  sessions: number;
  page_views: number;
  buy_box_pct: number;
  unit_session_pct: number;
  share_pct: number;
}

export interface IngestedCampaign {
  campaign_name: string;
  impressions: number;
  clicks: number;
  ad_spend: number;
  ad_sales: number;
  ad_orders: number;
  ad_units: number;
  acos: number;      // ad_spend / ad_sales * 100
  roas: number;      // ad_sales / ad_spend
  ctr: number;       // clicks / impressions * 100
  cpc: number;       // ad_spend / clicks
  cvr: number;       // ad_orders / clicks * 100
  cost_per_order: number; // ad_spend / ad_orders
  status: "healthy" | "warning" | "critical" | "no_sales";
}

export interface WastedKeyword {
  term: string;
  spend: number;
  clicks: number;
  orders: number;
}

export const ingestedApi = {
  getProducts: (clientId: number, days = 30) =>
    apiFetch<IngestedProduct[]>(`/ingested/products?clientId=${clientId}&days=${days}`),
  getCampaigns: (clientId: number, days = 30) =>
    apiFetch<IngestedCampaign[]>(`/ingested/campaigns?clientId=${clientId}&days=${days}`),
  getWastedKeywords: (clientId: number, days = 30) =>
    apiFetch<WastedKeyword[]>(`/ingested/wasted-keywords?clientId=${clientId}&days=${days}`),
};

// ── AI ─────────────────────────────────────────────────────────────────────

export const aiApi = {
  analyzeListing: (input: ListingInput) =>
    apiFetch<ListingAnalysis>("/ai/listing-analysis", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  analyzePpc: (input: CampaignInput) =>
    apiFetch<PpcAnalysis>("/ai/ppc-analysis", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /**
   * Intelligence Report — Reasoning Chain
   * Sends MetricsEngine output + campaign/search-term data to Claude.
   * Returns CRITICAL_ALERTS, PROFIT_OPTIMIZATION, GROWTH_LEVERS.
   */
  getIntelligenceReport: (input: ReasoningChainRequest) =>
    apiFetch<IntelligenceReport>("/ai/intelligence-report", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
