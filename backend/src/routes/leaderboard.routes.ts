import { Router } from "express";
import prisma from "../config/db.js";
import { rebuildLeaderboard } from "../jobs/leaderboard.job.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /leaderboard?page=1&limit=50
 */
router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const data = await prisma.leaderboard.findMany({
    orderBy: { rank: "asc" },
    skip,
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.json({ page, limit, data });
});

/**
 * GET /leaderboard/top/10
 */
router.get("/top/:n", async (req, res) => {
  const n = Math.min(100, Number(req.params.n) || 10);

  const data = await prisma.leaderboard.findMany({
    orderBy: { rank: "asc" },
    take: n,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  res.json(data);
});

/**
 * GET /leaderboard/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  const row = await prisma.leaderboard.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!row) {
    return res.status(404).json({ message: "User not ranked yet" });
  }

  res.json(row);
});

/**
 * POST /leaderboard/rebuild (manual trigger)
 * Protect this in production
 */
router.post("/rebuild", authenticate, async (_req, res) => {
  const result = await rebuildLeaderboard();
  res.json({ message: "Leaderboard rebuilt", result });
});

export default router;
