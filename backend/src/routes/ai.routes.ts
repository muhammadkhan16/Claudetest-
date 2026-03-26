import { Router, Request, Response, NextFunction } from "express";
import { analyzeListing, analyzePpcCampaign } from "../ai/layer";
import intelligenceRouter from "./intelligence.routes";

const router = Router();

// Mount intelligence report route
router.use(intelligenceRouter);

// POST /api/ai/listing-analysis
router.post(
  "/listing-analysis",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await analyzeListing(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/ppc-analysis
router.post(
  "/ppc-analysis",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await analyzePpcCampaign(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
