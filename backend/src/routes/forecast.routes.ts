/**
 * Forecast & Financial Calculator Routes
 *
 * POST /api/forecast/contribution-margin
 * POST /api/forecast/breakeven-acos
 * POST /api/forecast/tacos
 * POST /api/forecast/what-if
 */
import { Router, Request, Response, NextFunction } from "express";
import {
  calcContributionMargin,
  calcBreakevenAcos,
  calcTacos,
  runForecast,
  type ContributionMarginInput,
  type BreakevenAcosInput,
  type TacosInput,
  type ForecastBaselineInput,
  type ForecastScenario,
} from "../metrics/calculators/MetricsEngine";

const router = Router();

// POST /api/forecast/contribution-margin
router.post(
  "/contribution-margin",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as ContributionMarginInput;
      const data = calcContributionMargin(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/forecast/breakeven-acos
router.post(
  "/breakeven-acos",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as BreakevenAcosInput;
      const data = calcBreakevenAcos(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/forecast/tacos
router.post(
  "/tacos",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as TacosInput;
      const data = calcTacos(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/forecast/what-if
// Body: { baseline: ForecastBaselineInput, scenarios: ForecastScenario[] }
router.post(
  "/what-if",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baseline, scenarios } = req.body as {
        baseline: ForecastBaselineInput;
        scenarios: ForecastScenario[];
      };

      if (!baseline || !Array.isArray(scenarios)) {
        res.status(400).json({
          success: false,
          error: { message: "Body must include 'baseline' and 'scenarios' array", code: "INVALID_BODY" },
        });
        return;
      }

      const data = runForecast(baseline, scenarios);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
