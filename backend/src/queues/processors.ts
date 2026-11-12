import type { Job } from "bullmq";
import prisma from "../config/db.js";
import { persistSnapshot } from "../jobs/persistSnapshot.js";
import { processAccountSnapshot } from "../jobs/snapshot.job.js";
import { rebuildLeaderboard } from "../jobs/leaderboard.job.js";
import { getAdapter } from "../platforms/index.js";
import { fetchCodeforcesUsers } from "../services/codeforces.service.js";
import logger from "../utils/logger.js";
import { getQueue } from "./index.js";
import { syncQueueName } from "./config.js";
import { isPermanentError } from "./errors.js";

export interface SyncJobData {
  accountId: number;
  window: number;
}
export interface BatchJobData {
  accountIds: number[];
  window: number;
}
/** `neutral` results say nothing about platform health (breaker ignores them). */
export interface ProcessResult {
  neutral?: boolean;
  [key: string]: unknown;
}

export async function processSyncJob(job: Job<SyncJobData>): Promise<ProcessResult> {
  const acc = await prisma.linkedAccount.findUnique({ where: { id: job.data.accountId } });
  if (!acc) return { skipped: "account no longer exists", neutral: true };
  await processAccountSnapshot(acc);
  return { synced: acc.id };
}

async function fanOutToSingles(accountIds: number[], window: number): Promise<void> {
  if (accountIds.length === 0) return;
  await getQueue(syncQueueName("codeforces")).addBulk(
    accountIds.map((id) => ({
      name: "sync",
      data: { accountId: id, window } satisfies SyncJobData,
      opts: { jobId: `${id}-${window}-solo` },
    }))
  );
}

/**
 * One user.info call for up to CODEFORCES_BATCH_SIZE handles. A handle that is
 * unknown fails the whole call (400), so permanent failures fall back to one job
 * per account; transient ones are thrown and retried as a batch.
 */
export async function processCodeforcesBatch(job: Job<BatchJobData>): Promise<ProcessResult> {
  const { accountIds, window } = job.data;
  const accounts = await prisma.linkedAccount.findMany({
    where: { id: { in: accountIds }, platform: "codeforces" },
  });
  if (accounts.length === 0) return { skipped: "no accounts", neutral: true };

  let users: Awaited<ReturnType<typeof fetchCodeforcesUsers>>;
  try {
    users = await fetchCodeforcesUsers(accounts.map((a) => a.username));
  } catch (err) {
    if (!isPermanentError(err)) throw err;
    logger.warn("Codeforces batch rejected, falling back to single lookups", { accounts: accounts.length });
    await fanOutToSingles(accounts.map((a) => a.id), window);
    return { fallback: accounts.length, neutral: true };
  }

  const adapter = getAdapter("codeforces");
  const byHandle = new Map(users.map((u) => [u.handle.toLowerCase(), u]));
  const retrySingly: number[] = [];
  let synced = 0;
  for (const acc of accounts) {
    const user = byHandle.get(acc.username.toLowerCase());
    if (!user) {
      retrySingly.push(acc.id);
      continue;
    }
    try {
      await persistSnapshot(acc, adapter.toStats(user));
      synced++;
    } catch (err: any) {
      logger.error(`Failed to store Codeforces snapshot for ${acc.username}`, { error: err.message });
      retrySingly.push(acc.id);
    }
  }
  await fanOutToSingles(retrySingly, window);
  return { synced, retriedSingly: retrySingly.length };
}

export async function processLeaderboardJob(): Promise<ProcessResult> {
  await rebuildLeaderboard();
  return { rebuilt: true };
}
