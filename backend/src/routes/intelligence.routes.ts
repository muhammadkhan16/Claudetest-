/**
 * Intelligence Report Route
 *
 * POST /api/ai/intelligence-report
 *
 * Accepts the combined MetricsEngine output, campaign-level ACoS data,
 * and search term rows. Runs the pre-processor then the Reasoning Chain.
 * Returns a fully structured IntelligenceReport.
 *
 * Request body shape:
 * {
 *   metrics: {
 *     contributionMargin: ContributionMarginResult,
 *     breakeven: BreakevenAcosResult,
 *     tacos: TacosResult,
 *     forecast?: ForecastResult
 *   },
 *   campaigns: CampaignMetric[],
 *   searchTerms: SearchTermRow[],
 *   context?: {
 *     clientName?: string,
 *     reportPeriodDays?: number,
 *     marketplace?: string
 *   }
 * }
 */
import { Router, Request, Response, NextFunction } from "express";
import { runReasoningChain } from "../ai/layer";
import type { ReasoningChainInput } from "../ai/layer";

const router = Router();

router.post(
  "/intelligence-report",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as ReasoningChainInput;

      // Basic validation
      if (!input.metrics?.contributionMargin || !input.metrics?.breakeven || !input.metrics?.tacos) {
        res.status(400).json({
          success: false,
          error: {
            message: "Body must include metrics.contributionMargin, metrics.breakeven, and metrics.tacos",
            code: "INVALID_BODY",
          },
        });
        return;
      }

      if (!Array.isArray(input.campaigns) || !Array.isArray(input.searchTerms)) {
        res.status(400).json({
          success: false,
          error: {
            message: "Body must include campaigns[] and searchTerms[] arrays",
            code: "INVALID_BODY",
          },
        });
        return;
      }

      const data = await runReasoningChain(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
