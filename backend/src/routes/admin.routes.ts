import { Router, type Request, type Response, type NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import prisma from "../config/db.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { ALL_QUEUE_NAMES } from "../queues/config.js";
import { getQueue, getQueueCounts } from "../queues/index.js";
import logger from "../utils/logger.js";

const router = Router();

router.get("/jobs/summary", authenticate, requireAdmin, async (_req, res) => {
  const totalRuns = await prisma.jobRun.count();

  const success = await prisma.jobRun.count({
    where: { status: "success" },
  });

  const failed = await prisma.jobRun.count({
    where: { status: "failed" },
  });

  const lastRun = await prisma.jobRun.findFirst({
    orderBy: { createdAt: "desc" },
  });

  // Queue depth per queue; `failed` there is the dead-letter count.
  // null when Redis is not configured or unreachable.
  let queues = null;
  if (process.env.REDIS_URL) {
    try {
      queues = await getQueueCounts();
    } catch (err: any) {
      logger.warn("Could not read queue counts", { error: err.message });
    }
  }

  res.json({
    totalRuns,
    success,
    failed,
    lastRun,
    queues,
  });
});

// Bull Board, admin only. Read-only on purpose: its retry/clean buttons would be
// state-changing requests from the API origin, which the CSRF Origin check
// (FRONTEND_URL) rejects. Built lazily so the API starts without Redis.
let boardRouter: Router | undefined;
function getBoard(): Router {
  if (!boardRouter) {
    const adapter = new ExpressAdapter();
    adapter.setBasePath("/admin/queues");
    createBullBoard({
      queues: ALL_QUEUE_NAMES.map((n) => new BullMQAdapter(getQueue(n), { readOnlyMode: true })),
      serverAdapter: adapter,
    });
    boardRouter = adapter.getRouter() as Router;
  }
  return boardRouter;
}

router.use("/queues", authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.REDIS_URL) return res.status(503).json({ message: "Queues are not configured (REDIS_URL unset)" });
  return getBoard()(req, res, next);
});

export default router;
