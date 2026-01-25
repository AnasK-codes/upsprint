import cron from "node-cron";
import { runAllSnapshots } from "./snapshot.job.js";
import { rebuildLeaderboard } from "./leaderboard.job.js";
import logger from "../utils/logger.js";

/**
 * Initializes the background Cron jobs.
 * 
 * Schedules:
 * - Snapshot Sync: Runs every 6 hours (0 *\/6 * * *). Fetches fresh stats.
 * - Leaderboard Rebuild: Runs daily at 1 AM. Re-ranks all users based on new snapshots.
 * 
 * Also runs an initial snapshot sync on server startup to ensure fresh dev data.
 */
export function startCronJobs() {
  // Run immediately on startup
  logger.info("[CRON] Running initial snapshot job...");
  runAllSnapshots()
    .then(() => logger.info("[CRON] Initial snapshot complete"))
    .catch((err) => logger.error("[CRON] Initial snapshot failed", { error: err }));

  // Run snapshots every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      logger.info("[CRON] Starting snapshot job");
      await runAllSnapshots();
      logger.info("[CRON] Snapshot job completed");
    } catch (err) {
      logger.error("[CRON] Snapshot job failed", { error: err });
    }
  });

  // Rebuild leaderboard daily at 1 AM
  cron.schedule("0 1 * * *", async () => {
    try {
      logger.info("[CRON] Rebuilding leaderboard");
      await rebuildLeaderboard();
      logger.info("[CRON] Leaderboard rebuilt");
    } catch (err) {
      logger.error("[CRON] Leaderboard rebuild failed", { error: err });
    }
  });
}
