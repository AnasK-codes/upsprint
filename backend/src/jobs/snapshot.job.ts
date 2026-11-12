import prisma from "../config/db.js";
import { getAdapter } from "../platforms/index.js";
import logger from "../utils/logger.js";
import { recordJobRun } from "./jobRun.js";
import { persistSnapshot, type AccountRef } from "./persistSnapshot.js";

export interface SnapshotAccount extends AccountRef {
  platform: string;
}

/**
 * Fetches and stores a snapshot for a single linked account.
 *
 * Errors propagate to the caller: the queue worker needs them for retries and
 * the circuit breaker, and the connect endpoint needs them to roll back.
 */
export async function processAccountSnapshot(acc: SnapshotAccount): Promise<void> {
  const adapter = getAdapter(acc.platform);
  const profile = await adapter.fetchProfile(acc.username);
  await persistSnapshot(acc, adapter.toStats(profile));
  logger.info(`Processed ${acc.platform} snapshot for ${acc.username}`);
}

/**
 * Sequential reference path: syncs every account one by one in-process.
 * Production ingestion goes through the BullMQ queues (src/queues); this is kept
 * for benchmarks/scripts/time-sync.ts (M10), which measures the old sequential path.
 * A failing account is logged and skipped, as the old cron did.
 */
export async function runAllSnapshots() {
  return recordJobRun(
    "snapshot",
    async () => {
      const accounts = await prisma.linkedAccount.findMany();
      for (const acc of accounts) {
        try {
          await processAccountSnapshot(acc);
        } catch (err: any) {
          logger.error(`Failed snapshot for ${acc.platform}:${acc.username}`, { error: err.message });
        }
      }
      return { accounts: accounts.length };
    },
    (r) => `${r.accounts} accounts processed`
  );
}
