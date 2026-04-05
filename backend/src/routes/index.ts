import { Router } from "express";
import metricsRoutes from "./metrics.routes";
import aiRoutes from "./ai.routes";
import clientsRoutes from "./clients.routes";
import uploadsRoutes from "./uploads.routes";
import forecastRoutes from "./forecast.routes";
import ingestedRoutes from "./ingested.routes";

const router = Router();

router.use("/metrics", metricsRoutes);
router.use("/ai", aiRoutes);
router.use("/clients", clientsRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/forecast", forecastRoutes);
router.use("/ingested", ingestedRoutes);

// Health check
router.get("/health", (_req, res) => {
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

export default router;
