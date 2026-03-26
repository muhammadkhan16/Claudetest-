/**
 * Upload Routes
 *
 * POST /api/uploads
 *   - Accepts a single CSV file (multipart/form-data)
 *   - Detects report type automatically OR accepts ?type=business_report|ppc|search_terms
 *   - Normalizes headers, batch-inserts rows, returns job summary
 *
 * GET  /api/uploads?clientId=1
 *   - Lists upload jobs for a client
 *
 * GET  /api/uploads/:id
 *   - Returns a specific upload job
 */
import { Router, Request, Response, NextFunction } from "express";
import { csvUpload } from "../ingestion/upload/multer";
import { normalizer } from "../ingestion/normalizer";
import { processBusinessReport } from "../ingestion/processors/business-report";
import { processPpcReport } from "../ingestion/processors/ppc-report";
import { processSearchTermsReport } from "../ingestion/processors/search-terms-report";
import { batchInsertRows } from "../ingestion/batch-insert";
import { uploadsRepository } from "../data/repositories/uploads.repository";
import { parseCsvBuffer } from "../ingestion/csv-parser";

const router = Router();

// ── POST /api/uploads ──────────────────────────────────────────────────────
router.post(
  "/",
  csvUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { message: "No file uploaded. Field name must be 'file'.", code: "NO_FILE" },
      });
      return;
    }

    const clientId = Number(req.body.clientId ?? req.query.clientId);
    if (!clientId || isNaN(clientId)) {
      res.status(400).json({
        success: false,
        error: { message: "clientId is required", code: "MISSING_CLIENT_ID" },
      });
      return;
    }

    const buffer = req.file.buffer;

    // Detect report type
    let reportType = (req.query.type ?? req.body.type) as string | undefined;
    if (!reportType || !["business_report", "ppc", "search_terms"].includes(reportType)) {
      const { headers } = await parseCsvBuffer(buffer);
      reportType = normalizer.detectReportType(headers);
    }

    // Create job record
    const job = await uploadsRepository.create(
      clientId,
      reportType,
      req.file.originalname,
      req.file.size
    );

    // Process asynchronously — respond immediately with job ID
    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        reportType,
        filename: req.file.originalname,
        status: "processing",
        message: "Upload received. Processing in background.",
      },
    });

    // Background processing
    processUpload(job.id, clientId, reportType, buffer).catch((err) => {
      console.error(`[Upload] Job ${job.id} failed:`, err.message);
    });
  }
);

// ── GET /api/uploads?clientId=1 ────────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = Number(req.query.clientId);
    if (!clientId) {
      res.status(400).json({
        success: false,
        error: { message: "clientId query param required", code: "MISSING_CLIENT_ID" },
      });
      return;
    }
    const data = await uploadsRepository.findByClient(clientId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/uploads/:id ───────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await uploadsRepository.findById(Number(req.params.id));
    if (!job) {
      res.status(404).json({
        success: false,
        error: { message: "Upload job not found", code: "NOT_FOUND" },
      });
      return;
    }
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

// ── Background processor ────────────────────────────────────────────────────
async function processUpload(
  jobId: number,
  clientId: number,
  reportType: string,
  buffer: Buffer
): Promise<void> {
  await uploadsRepository.markProcessing(jobId);

  try {
    let result;

    switch (reportType) {
      case "ppc":
        result = await processPpcReport(buffer);
        break;
      case "search_terms":
        result = await processSearchTermsReport(buffer);
        break;
      default:
        result = await processBusinessReport(buffer);
    }

    const { inserted, durationMs } = await batchInsertRows({
      uploadJobId: jobId,
      clientId,
      reportType,
      rows: result.rows,
    });

    await uploadsRepository.markCompleted(jobId, result.rows.length + result.skipped, inserted);

    console.log(
      `[Upload] Job ${jobId} done — ${inserted} rows in ${durationMs}ms ` +
      `(${result.skipped} skipped)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await uploadsRepository.markFailed(jobId, message);
    throw err;
  }
}

export default router;
