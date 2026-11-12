import prisma from "../config/db.js";
import { recordJobRun } from "../jobs/jobRun.js";
import { isPlatform, type PlatformName } from "../platforms/index.js";
import logger from "../utils/logger.js";
import { getQueue } from "./index.js";
import {
  LEADERBOARD_QUEUE,
  SCHEDULER_QUEUE,
  getQueueConfig,
  syncQueueName,
} from "./config.js";
import type { BatchJobData, SyncJobData } from "./processors.js";

export interface EnqueueResult {
  window: number;
  accounts: number;
  jobs: number;
}

/**
 * Enqueues one sync job per linked account (Codeforces: one job per batch of
 * handles). Job ids embed the time window, so a second scheduler replica (or a
 * retried tick) in the same window adds nothing: BullMQ ignores duplicate ids.
 * Accounts are read in id-ordered pages, never loaded all at once.
 */
export async function enqueueAllSyncs(now: number = Date.now()): Promise<EnqueueResult> {
  const cfg = getQueueConfig();
  const window = Math.floor(now / cfg.syncIntervalMs);
  const jitter = () => Math.floor(Math.random() * cfg.syncJitterMs);

  let cursor = 0;
  let accounts = 0;
  let jobs = 0;
  const cfPending: number[] = [];

  const flushCodeforces = async (force: boolean) => {
    while (cfPending.length >= cfg.codeforcesBatchSize || (force && cfPending.length > 0)) {
      const ids = cfPending.splice(0, cfg.codeforcesBatchSize);
      await getQueue(syncQueueName("codeforces")).add(
        "sync-batch",
        { accountIds: ids, window } satisfies BatchJobData,
        { jobId: `cf-${window}-${ids[0]}-${ids[ids.length - 1]}`, delay: jitter() }
      );
      jobs++;
    }
  };

  for (;;) {
    const page = await prisma.linkedAccount.findMany({
      where: { id: { gt: cursor } },
      orderBy: { id: "asc" },
      take: cfg.enqueuePageSize,
      select: { id: true, platform: true },
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;
    accounts += page.length;

    const byPlatform = new Map<PlatformName, number[]>();
    for (const a of page) {
      if (!isPlatform(a.platform)) {
        logger.warn("Skipping account with unknown platform", { id: a.id, platform: a.platform });
        continue;
      }
      if (a.platform === "codeforces") cfPending.push(a.id);
      else byPlatform.set(a.platform, [...(byPlatform.get(a.platform) ?? []), a.id]);
    }

    for (const [platform, ids] of byPlatform) {
      await getQueue(syncQueueName(platform)).addBulk(
        ids.map((id) => ({
          name: "sync",
          data: { accountId: id, window } satisfies SyncJobData,
          opts: { jobId: `${id}-${window}`, delay: jitter() },
        }))
      );
      jobs += ids.length;
    }
    await flushCodeforces(false);
  }
  await flushCodeforces(true);

  logger.info("Enqueued sync jobs", { window, accounts, jobs });
  return { window, accounts, jobs };
}

/** The scheduler tick: enqueue everything and record it as a "snapshot" JobRun. */
export function runSchedulerTick(now?: number): Promise<EnqueueResult> {
  return recordJobRun(
    "snapshot",
    () => enqueueAllSyncs(now),
    (r) => `${r.accounts} accounts enqueued as ${r.jobs} jobs`
  );
}

/**
 * Registers the repeatable schedules in Redis. upsertJobScheduler is idempotent
 * and keyed by id, so every worker replica can call it at boot and Redis still
 * holds exactly one schedule: only one tick fires per interval cluster-wide.
 * There is deliberately NO sync at startup.
 */
export async function registerSchedules(): Promise<void> {
  const cfg = getQueueConfig();
  // An `every` schedule fires once immediately on creation, which would be a
  // startup sync. Intervals that divide the day use a cron pattern (fires only on
  // UTC boundaries, matching the window ids); others use `every` anchored to the
  // next window boundary via startDate.
  const hours = cfg.syncIntervalMs / 3_600_000;
  const repeat =
    Number.isInteger(hours) && 24 % hours === 0
      ? { pattern: `0 */${hours} * * *`, tz: "UTC" }
      : {
          every: cfg.syncIntervalMs,
          startDate: new Date((Math.floor(Date.now() / cfg.syncIntervalMs) + 1) * cfg.syncIntervalMs),
        };
  await getQueue(SCHEDULER_QUEUE).upsertJobScheduler("sync-tick", repeat, { name: "tick" });
  await getQueue(LEADERBOARD_QUEUE).upsertJobScheduler(
    "leaderboard-rebuild",
    { pattern: cfg.leaderboardCron, tz: "UTC" },
    { name: "rebuild" }
  );
}
