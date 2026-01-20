// backend/src/jobs/leaderboard.job.ts
import prisma from "../config/db.js";
import {
  fetchLatestSnapshotsWithAccountUser,
  computeScore,
} from "../services/leaderboard.service.js";
import { clearCachePrefix } from "../utils/cache.js";
import logger from "../utils/logger.js";
import { incCounter, setGauge } from "../utils/metrics.js";

/** Simple platform weights (tweakable) */
const PLATFORM_WEIGHTS: Record<string, number> = {
  codeforces: 1.0,
  leetcode: 0.6,
  codechef: 0.4,
};

/**
 * Rebuild leaderboard:
 *  - fetch latest snapshots in one query
 *  - aggregate scores per user in memory
 *  - upsert leaderboard entries in batches
 *  - update simple metrics and logs
 */
export async function rebuildLeaderboard() {
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
    rows.sort((a, b) => b.score - a.score);

    // Upsert in batches
    const BATCH = 200;
    let ops: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      ops.push(
        prisma.leaderboard.upsert({
          where: { userId: rows[i].userId },
          create: { userId: rows[i].userId, score: rows[i].score, rank: i + 1 },
          update: { score: rows[i].score, rank: i + 1 },
        })
      );

      if (ops.length >= BATCH) {
        await prisma.$transaction(ops);
        ops = [];
      }
    }
    if (ops.length) await prisma.$transaction(ops);

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
