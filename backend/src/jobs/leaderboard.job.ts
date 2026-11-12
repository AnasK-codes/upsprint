import prisma from "../config/db.js";
import {
  fetchLatestSnapshotsWithAccountUser,
  computeScore,
} from "../services/leaderboard.service.js";
import { clearCachePrefix } from "../utils/cache.js";
import logger from "../utils/logger.js";
import { competitionRanks } from "../utils/ranking.js";
import { recordJobRun } from "./jobRun.js";
import { incCounter, setGauge } from "../utils/metrics.js";

/** Simple platform weights (tweakable) */
const PLATFORM_WEIGHTS: Record<string, number> = {
  codeforces: 0.6,
  leetcode: 0.8,
  codechef: 0.6,
};

/**
 * Rebuilds the Global Leaderboard.
 * 
 * Strategy:
 * 1. Fetch latest snapshots for all users across all platforms (optimized single query).
 * 2. Aggregate scores in-memory:
 *    - Score = (NormalizedRating * PlatformWeight * 1000)
 *    - Users can have multiple platforms; scores are summed (or averaged, based on specific logic).
 * 3. Sort users by total score descending.
 * 4. Atomic Replace:
 *    - We first DELETE all entries to remove stale users (e.g. those who disconnected accounts).
 *    - Then we BULK INSERT the represented rankings.
 * 
 * This ensures the leaderboard is always consistent with the latest snapshot data.
 * @returns Stats about the rebuild (users ranked, duration).
 */
export async function rebuildLeaderboard() {
  return recordJobRun(
    "leaderboard",
    () => rebuildLeaderboardInner(),
    (r) => `${r.totalUsers} users ranked`
  );
}

async function rebuildLeaderboardInner() {
  const start = Date.now();
  incCounter("leaderboard_rebuild_runs", "Number of times leaderboard rebuild ran");
  try {
    logger.info("leaderboard.rebuild started");

    const latest = await fetchLatestSnapshotsWithAccountUser();
    incCounter("leaderboard_rebuild_snapshots_fetched", "Number of snapshots fetched", latest.length);

    // aggregate per user
    const scoreMap = new Map<number, number>();
    for (const s of latest) {
      const platform = s.platform ?? s.rawData?.platform ?? "codeforces";
      const weight = PLATFORM_WEIGHTS[platform] ?? 1;

      const score = computeScore(platform, s.rating, weight);
      scoreMap.set(s.userId, (scoreMap.get(s.userId) ?? 0) + score);
    }

    const rows = Array.from(scoreMap.entries()).map(([userId, score]) => ({
      userId,
      score,
    }));
    // Deterministic order: best score first, then lowest userId.
    rows.sort((a, b) => b.score - a.score || a.userId - b.userId);

    // Ranks are what a viewer sees: standard competition ranking (1,2,2,4)
    // over users who appear on the public leaderboard. GROUPS_ONLY users are
    // never listed, so they don't take up ranks; they are stored with rank 0.
    const hidden = new Set(
      (
        await prisma.user.findMany({
          where: { leaderboardVisibility: "GROUPS_ONLY" },
          select: { id: true },
        })
      ).map((u) => u.id)
    );
    const visibleRows = rows.filter((r) => !hidden.has(r.userId));
    const visibleRanks = competitionRanks(visibleRows, (r) => r.score);
    const entries = [
      ...visibleRows.map((r, i) => ({ ...r, rank: visibleRanks[i] })),
      ...rows.filter((r) => hidden.has(r.userId)).map((r) => ({ ...r, rank: 0 })),
    ];

    // Build all createMany batch operations upfront
    const BATCH = 200;
    const createBatches = [];
    for (let i = 0; i < entries.length; i += BATCH) {
      const batchData = entries.slice(i, i + BATCH).map((row) => ({
        userId: row.userId,
        score: row.score,
        rank: row.rank,
      }));
      createBatches.push(prisma.leaderboard.createMany({ data: batchData }));
    }

    // ATOMIC TRANSACTION: wipe and rebuild in one DB transaction.
    // Guarantees zero downtime — users never see an empty or partial leaderboard.
    // If any batch insert fails, the deleteMany is rolled back and the old
    // leaderboard is preserved intact.
    await prisma.$transaction([
      prisma.leaderboard.deleteMany({}),
      ...createBatches,
    ]);

    // clear cache so API returns fresh data
    clearCachePrefix("leaderboard:");

    const durationMs = Date.now() - start;
    setGauge(
      "leaderboard_rebuild_last_duration_ms",
      "Duration of last leaderboard rebuild in ms",
      durationMs
    );

    setGauge(
      "leaderboard_users_ranked",
      "Number of users ranked in last rebuild",
      rows.length
    );

    logger.info("leaderboard.rebuild complete", {
      users: rows.length,
      snapshots: latest.length,
      durationMs,
    });

    return { totalUsers: rows.length, snapshots: latest.length, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error("leaderboard.rebuild failed", { error: err, durationMs });
    setGauge("leaderboard_rebuild_last_failed_timestamp", "Timestamp of last leaderboard rebuild failure", Date.now());
    throw err;
  }
}
