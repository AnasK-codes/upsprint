import { Router } from "express";
import { checkReadiness } from "../services/health.service.js";

const router = Router();

// Liveness: the process is up and the event loop responds. No dependencies.
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Readiness: dependencies (Postgres, Redis if configured) are reachable.
router.get("/readyz", async (_req, res) => {
  const { ready, checks } = await checkReadiness();
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable", checks });
});

export default router;
