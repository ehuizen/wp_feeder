// GET /api/health: the one public route, for uptime checks.
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});
