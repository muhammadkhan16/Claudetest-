import { Router, Request, Response, NextFunction } from "express";
import { metricsRepository } from "../data/repositories/metrics.repository";
import { metricsEngine } from "../metrics/engine";

const router = Router();

// GET /api/metrics/overview
router.get("/overview", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = await metricsRepository.getOverview();
    if (!raw) {
      res.json({ success: true, data: null });
      return;
    }
    const data = metricsEngine.buildOverview(raw);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/metrics/trend?days=30
router.get("/trend", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const rows = await metricsRepository.getRevenueTrend(days);
    const data = metricsEngine.buildTrend(rows);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/metrics/top-products?limit=10
router.get("/top-products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const data = await metricsRepository.getTopProducts(limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
