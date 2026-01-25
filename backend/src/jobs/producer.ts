import prisma from "../config/db.js";
import { snapshotQueue } from "../config/queue.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";
import { fetchLeetCodeProfile } from "../services/leetcode.service.js";
import logger from "../utils/logger.js";

/**
 * Register snapshot processor (called once at startup)
 */
snapshotQueue.registerProcessor(async ({ accountId, username, platform }) => {
  if (platform === "codeforces") {
    const data = await fetchCodeforcesUser(username);
    await prisma.platformSnapshot.create({
      data: {
        linkedAccountId: accountId,
        rating: data.rating ?? null,
        rankTitle: data.rank ?? null,
        problemsSolved: data.maxRating ?? null,
        rawData: data,
      },
    });
    logger.info(`[QUEUE] Codeforces snapshot saved for ${username}`);
  } else if (platform === "leetcode") {
    const data = await fetchLeetCodeProfile(username);
    await prisma.platformSnapshot.create({
      data: {
        linkedAccountId: accountId,
        rating: data.rating,
        rankTitle: null,
        problemsSolved: data.totalSolved,
        rawData: data.raw,
      },
    });
    logger.info(`[QUEUE] LeetCode snapshot saved for ${username}`);
  }
});

/**
 * Enqueue snapshot for a single account
 */
export async function enqueueSnapshot(payload: {
  accountId: number;
  username: string;
  platform: string;
}) {
  await snapshotQueue.add(payload);
}

/**
 * Enqueue snapshots for all linked accounts
 * (used by cron)
 */
export async function enqueueSnapshotForAll() {
  const accounts = await prisma.linkedAccount.findMany();

  for (const acc of accounts) {
    await snapshotQueue.add({
      accountId: acc.id,
      username: acc.username,
      platform: acc.platform,
    });
  }
}
