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
