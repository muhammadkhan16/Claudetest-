import { Router, Request, Response, NextFunction } from "express";
import { clientsRepository } from "../data/repositories/clients.repository";

const router = Router();

// GET /api/clients
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clientsRepository.findAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/audit
router.get("/audit", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clientsRepository.getAuditSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientsRepository.findById(Number(req.params.id));
    if (!client) {
      res.status(404).json({ success: false, error: { message: "Client not found", code: "NOT_FOUND" } });
      return;
    }
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

export default router;
