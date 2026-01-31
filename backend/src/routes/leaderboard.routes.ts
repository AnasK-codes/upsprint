import { Router } from "express";
import prisma from "../config/db.js";
import { rebuildLeaderboard } from "../jobs/leaderboard.job.js";
import {
  getLeetCodeLeaderboard,
  getDailyActivityLeaderboard,
  getPlatformLeaderboard,
} from "../services/leaderboard.service.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getCache, setCache, clearCachePrefix } from "../utils/cache.js";

const router = Router();

const VALID_BRANCHES = ["CSE", "IT", "ECE", "ME", "EE", "CE", "CHE"];
const VALID_PLATFORMS = ["leetcode", "codeforces", "codechef"];

const validateFilters = (req: any, res: any, next: any) => {
  const { batch, branch, platform } = req.query;

  if (batch && batch !== "All") {
    if (!/^\d{4}$/.test(String(batch))) {
      return res.status(400).json({ message: "Invalid batch year" });
    }
  }

  if (branch && branch !== "All") {
    if (!VALID_BRANCHES.includes(String(branch))) {
      return res.status(400).json({ message: "Invalid branch" });
    }
  }

  if (platform && platform !== "All" && platform !== "all") {
    if (!VALID_PLATFORMS.includes(String(platform).toLowerCase())) {
      return res.status(400).json({ message: "Invalid platform" });
    }
  }

  next();
};

const getCacheKey = (type: string, query: any) => {
  const { batch, branch, platform } = query;
  // Bump version to v2 to invalidate old cache
  const parts = [`leaderboard:v3:${type}`];

  if (batch && batch !== "All") parts.push(`batch=${batch}`);
  if (branch && branch !== "All") parts.push(`branch=${branch}`);
  if (platform && platform !== "All" && platform !== "all") parts.push(`platform=${String(platform).toLowerCase()}`);

  // Include page/limit in cache key to avoid collisions
  const page = query.page || 1;
  const limit = query.limit || 50;
  parts.push(`p=${page}:l=${limit}`);

  return parts.join(":");
};

router.get("/ping", (req, res) => res.json({ pong: true }));

/**
 * GET /leaderboard/daily-activity
 */
router.get("/daily-activity", validateFilters, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const { batch, branch, platform } = req.query;

    const cacheKey = getCacheKey("daily-activity", req.query);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await getDailyActivityLeaderboard(page, limit, {
      batch: batch as string,
      branch: branch as string,
      platform: platform as string,
    });

    const response = { page, limit, data };
    setCache(cacheKey, response, 60); // 1 min cache
    res.json(response);
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
router.get("/leetcode", validateFilters, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const { batch, branch } = req.query;

    const cacheKey = getCacheKey("leetcode", req.query);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await getLeetCodeLeaderboard(page, limit, {
      batch: batch as string,
      branch: branch as string,
    });

    const response = { page, limit, data };
    setCache(cacheKey, response, 60);
    res.json(response);
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
router.get("/", validateFilters, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const { batch, branch, platform } = req.query;

    const cacheKey = getCacheKey("global", req.query);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // If specific platform is requested, use platform-specific logic
    if (platform && platform !== "all" && platform !== "All") {
      const platformName = String(platform).toLowerCase();
      const data = await getPlatformLeaderboard(platformName, page, limit, {
        batch: batch as string,
        branch: branch as string
      });

      const response = { page, limit, data };
      setCache(cacheKey, response, 60);
      return res.json(response);
    }

    // Fallback to Global Leaderboard (Normalized Scores)
    const where: any = {};
    const userWhere: any = {};

    // safely convert batch to number string if valid
    if (batch && batch !== "All") {
      const batchNum = Number(batch);
      if (!isNaN(batchNum)) {
        userWhere.batch = String(batchNum);
      }
    }

    if (branch && branch !== "All") {
      userWhere.branch = String(branch);
    }

    // Note: Global leaderboard already aggregates scores, so we don't strictly filter by platform 
    // unless we want to filter users who HAVE that platform account but use their GLOBAL score.
    // The requirement says "Global leaderboard uses normalizedScore", which implies aggregate.
    // If a user provides ?platform=all, we return global ranking.

    if (Object.keys(userWhere).length > 0) {
      where.user = {
        ...userWhere,
        leaderboardVisibility: "GLOBAL_AND_GROUPS" as any
      };
    } else {
      where.user = {
        leaderboardVisibility: "GLOBAL_AND_GROUPS" as any
      };
    }

    const rows = await prisma.leaderboard.findMany({
      where,
      orderBy: { rank: "asc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const data = rows.map(row => ({
      ...row,
      scoreType: "normalized"
    }));

    const response = { page, limit, data };
    setCache(cacheKey, response, 60);
    res.json(response);
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
      // STRICT: Only include users who have opted into global leaderboards
      where: {
        user: {
          leaderboardVisibility: "GLOBAL_AND_GROUPS",
        } as any,
      },
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
      include: {
        user: {
          include: { accounts: true },
        },
      },
    });

    // STRICT: If user exists but is hidden, treat as not found/not ranked globally
    if (row && (row.user as any).leaderboardVisibility === "GROUPS_ONLY") {
      return res.status(404).json({ message: "This user prefers to hide their accounts" });
    }

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
    // Clear all leaderboard caches
    clearCachePrefix("leaderboard:");

    const result = await rebuildLeaderboard();
    res.json({ message: "Leaderboard rebuilt", result });
  } catch (err) {
    console.error("POST /leaderboard/rebuild error:", err);
    res.status(500).json({ message: "Rebuild failed" });
  }
});


export default router;
