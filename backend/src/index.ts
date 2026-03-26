import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { testConnection } from "./config/database";
import apiRoutes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ────────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();

  app.listen(env.PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║  Amazon Intelligence Backend                 ║
║  http://localhost:${env.PORT}  [${env.NODE_ENV}]          ║
╚══════════════════════════════════════════════╝

  Layers:
  ├── Data Layer      → src/data/repositories/
  ├── Metrics Engine  → src/metrics/
  └── AI Layer        → src/ai/

  Routes:
  ├── GET  /api/metrics/overview
  ├── GET  /api/metrics/trend
  ├── GET  /api/metrics/top-products
  ├── POST /api/ai/intelligence-report  ← Reasoning Chain
  ├── POST /api/ai/listing-analysis
  ├── POST /api/ai/ppc-analysis
  ├── GET  /api/clients
  ├── GET  /api/clients/audit
  ├── POST /api/uploads          (CSV ingestion)
  ├── GET  /api/uploads/:id
  ├── POST /api/forecast/contribution-margin
  ├── POST /api/forecast/breakeven-acos
  ├── POST /api/forecast/tacos
  ├── POST /api/forecast/what-if
  └── GET  /api/health
`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
