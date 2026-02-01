import { Router } from "express";
import prisma from "../config/db.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/jobs/summary", authenticate, async (_req, res) => {
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

  res.json({
    totalRuns,
    success,
    failed,
    lastRun,
  });
});

export default router;
