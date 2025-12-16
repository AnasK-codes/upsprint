import cron from "node-cron";
import prisma from "./db.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";

/**
 * Runs snapshot collection for all linked accounts
 */
export async function runSnapshotsJob() {
  console.log("[CRON] Snapshot job started");

  const accounts = await prisma.linkedAccount.findMany();

  for (const acc of accounts) {
    try {
      if (acc.platform === "codeforces") {
        const data = await fetchCodeforcesUser(acc.username);

        await prisma.platformSnapshot.create({
          data: {
            linkedAccountId: acc.id,
            rating: data.rating ?? null,
            rankTitle: data.rank ?? null,
            problemsSolved: data.maxRating ?? null,
            rawData: data,
          },
        });

        console.log(`[CRON] Snapshot saved for ${acc.username}`);
      }
    } catch (err) {
      console.error(`[CRON] Failed for ${acc.username}`, err);
    }
  }

  console.log("[CRON] Snapshot job finished");
}

/**
 * Start cron scheduler
 * Runs every 6 hours
 */
export function startCronJobs() {
  cron.schedule("0 */6 * * *", async () => {
    await runSnapshotsJob();
  });

  console.log("✅ Cron jobs scheduled (every 6 hours)");
}
