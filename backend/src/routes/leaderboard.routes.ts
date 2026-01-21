import { Router } from "express";
import prisma from "../config/db.js";
import { rebuildLeaderboard } from "../jobs/leaderboard.job.js";
import { getLeetCodeLeaderboard, getDailyActivityLeaderboard } from "../services/leaderboard.service.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getCache, setCache } from "../utils/cache.js";

const router = Router();


router.get("/ping", (req, res) => res.json({ pong: true }));

/**
 * GET /leaderboard/daily-activity
 */
router.get("/daily-activity", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const data = await getDailyActivityLeaderboard(page, limit);
    res.json({ page, limit, data });
  } catch (err) {
    console.error("GET /leaderboard/daily-activity error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /leaderboard/daily-activity/top/:n
 */
router.get("/daily-activity/top/:n", async (req, res) => {
  try {
    const n = Math.min(100, Number(req.params.n) || 10);
    const cacheKey = `leaderboard:daily-activity:top:${n}`;

    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await getDailyActivityLeaderboard(1, n);

    setCache(cacheKey, data, 60); // 1 min cache
    res.json(data);
  } catch (err) {
    console.error("GET /leaderboard/daily-activity/top error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /leaderboard/leetcode
 */
router.get("/leetcode", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const data = await getLeetCodeLeaderboard(page, limit);
    res.json({ page, limit, data });
  } catch (err) {
    console.error("GET /leaderboard/leetcode error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /leaderboard/leetcode/top/:n
 */
router.get("/leetcode/top/:n", async (req, res) => {
  try {
    const n = Math.min(100, Number(req.params.n) || 10);
    const cacheKey = `leaderboard:leetcode:top:${n}`;

    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await getLeetCodeLeaderboard(1, n);

    setCache(cacheKey, data, 60); // 1 min cache
    res.json(data);
  } catch (err) {
    console.error("GET /leaderboard/leetcode/top error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

    const accountWithMaxStreak = await prisma.linkedAccount.findFirst({
      where: { userId },
      orderBy: { currentStreak: "desc" },
    });
    const currentStreak = accountWithMaxStreak?.currentStreak || 0;

    if (!row) {
      // If user is not yet on the global leaderboard, return partial data if they have connected accounts
      if (currentStreak > 0) {
        return res.json({
          rank: 0, // Not ranked globally yet
          score: 0,
          currentStreak,
          user: { id: userId, name: "User" } // Minimal user
        });
      }
      return res.status(404).json({ message: "User not ranked yet" });
    }

    console.log(`[DEBUG] Fetching user rank for ${userId}. Found row: ${!!row}`);
    console.log(`[DEBUG] Max streak for ${userId}: ${currentStreak}`);

    // Explicitly construct object to avoid potential spread issues or hidden properties
    const responseData = {
      id: row.id,
      userId: row.userId,
      score: row.score,
      rank: row.rank,
      updatedAt: row.updatedAt,
      user: row.user,
      currentStreak: currentStreak
    };

    res.json(responseData);
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
