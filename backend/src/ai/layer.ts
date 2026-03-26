/**
 * AI Layer — Public Interface
 *
 * Single entry point for all AI functionality.
 * Routes internally to the appropriate analyzer.
 * Decoupled from Data Layer and Metrics Engine.
 */
export { analyzeListing } from "./analyzers/listing";
export type { ListingInput, ListingAnalysis, ListingSuggestion } from "./analyzers/listing";

export { analyzePpcCampaign } from "./analyzers/ppc";
export type { CampaignInput, PpcAnalysis, PpcInsight } from "./analyzers/ppc";

export { runReasoningChain } from "./analyzers/reasoning-chain";
export type {
  ReasoningChainInput,
  IntelligenceReport,
  CriticalAlert,
  ProfitOptimization,
  GrowthLever,
} from "./analyzers/reasoning-chain";

export { preProcess } from "./analyzers/pre-processor";
export type {
  CampaignMetric,
  SearchTermRow,
  PreProcessorResult,
  ProfitLeak,
  NegativeKeywordCandidate,
} from "./analyzers/pre-processor";
