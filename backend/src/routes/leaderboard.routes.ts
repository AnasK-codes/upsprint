import { Router } from "express";
import prisma from "../config/db.js";
import { rebuildLeaderboard } from "../jobs/leaderboard.job.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getCache, setCache } from "../utils/cache.js";

const router = Router();

/**
 * GET /leaderboard?page=1&limit=50
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const data = await prisma.leaderboard.findMany({
      orderBy: { rank: "asc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ page, limit, data });
  } catch (err) {
    console.error("GET /leaderboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /leaderboard/top/:n
 * Cached for a short TTL
 */
router.get("/top/:n", async (req, res) => {
  try {
    const n = Math.min(100, Number(req.params.n) || 10);
    const cacheKey = `leaderboard:top:${n}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await prisma.leaderboard.findMany({
      orderBy: { rank: "asc" },
      take: n,
      include: { user: { select: { id: true, name: true } } },
    });

    setCache(cacheKey, data, 30); // 30s TTL
    res.json(data);
  } catch (err) {
    console.error("GET /leaderboard/top error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /leaderboard/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const row = await prisma.leaderboard.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!row) return res.status(404).json({ message: "User not ranked yet" });
    res.json(row);
  } catch (err) {
    console.error("GET /leaderboard/user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /leaderboard/rebuild (manual trigger)
 * Protect with auth (authenticate middleware)
 */
router.post("/rebuild", authenticate, async (_req, res) => {
  try {
    const result = await rebuildLeaderboard();
    res.json({ message: "Leaderboard rebuilt", result });
  } catch (err) {
    console.error("POST /leaderboard/rebuild error:", err);
    res.status(500).json({ message: "Rebuild failed" });
  }
});

export default router;
