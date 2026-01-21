import cron from "node-cron";
import { runAllSnapshots } from "./snapshot.js";
import { rebuildLeaderboard } from "./leaderboard.job.js";

export function startCronJobs() {
  // Run immediately on startup
  console.log("[CRON] Running initial snapshot job...");
  runAllSnapshots().then(() => console.log("[CRON] Initial snapshot complete")).catch(err => console.error("[CRON] Initial snapshot failed", err));

  // Run snapshots every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[CRON] Starting snapshot job");
      await runAllSnapshots();
      console.log("[CRON] Snapshot job completed");
    } catch (err) {
      console.error("[CRON] Snapshot job failed", err);
    }
  });

  // Rebuild leaderboard daily at 1 AM
  cron.schedule("0 1 * * *", async () => {
    try {
      console.log("[CRON] Rebuilding leaderboard");
      await rebuildLeaderboard();
      console.log("[CRON] Leaderboard rebuilt");
    } catch (err) {
      console.error("[CRON] Leaderboard rebuild failed", err);
    }
  });
}
