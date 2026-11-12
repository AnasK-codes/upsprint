import { UnrecoverableError, Worker, type Job } from "bullmq";
import { getConnectedRedis } from "../config/redis.js";
import logger from "../utils/logger.js";
import { PLATFORM_NAMES, type PlatformName } from "../platforms/index.js";
import { BACKOFF_TYPE, computeBackoff } from "./backoff.js";
import { CircuitBreaker } from "./circuitBreaker.js";
import {
  LEADERBOARD_QUEUE,
  SCHEDULER_QUEUE,
  getQueueConfig,
  platformConfig,
  syncQueueName,
} from "./config.js";
import { bullConnection } from "./connection.js";
import { isPermanentError } from "./errors.js";
import { getQueue } from "./index.js";
import {
  processCodeforcesBatch,
  processLeaderboardJob,
  processSyncJob,
  type ProcessResult,
} from "./processors.js";
import { runSchedulerTick } from "./scheduler.js";

const breakerKey = (p: PlatformName) => `upsprint:breaker:open:${p}`;

function attachLogging(worker: Worker) {
  worker.on("error", (err) => logger.error(`[${worker.name}] worker error`, { error: err.message }));
  worker.on("failed", (job, err) => {
    const final = job && job.attemptsMade >= (job.opts.attempts ?? 1);
    logger[final ? "error" : "warn"](`[${worker.name}] job ${job?.id} failed`, {
      attempt: job?.attemptsMade,
      final,
      error: err.message,
    });
  });
}

/**
 * Sync worker for one platform. Its queue gives it an isolated rate limiter,
 * concurrency and pause switch. Wraps the processor with the circuit breaker:
 * transient failures count against the platform, permanent ones (unknown user)
 * skip retries and are ignored by the breaker.
 */
export function createSyncWorker(platform: PlatformName): { worker: Worker; breaker: CircuitBreaker } {
  const cfg = getQueueConfig();
  const pc = platformConfig(platform);
  const queue = getQueue(syncQueueName(platform));

  const breaker = new CircuitBreaker(
    cfg.breaker,
    async (cooldownMs) => {
      logger.error(`[${platform}] circuit OPEN, pausing queue`, { cooldownMs });
      await queue.pause();
      // Marker so a restarted worker can tell a breaker pause from an operator pause.
      await (await getConnectedRedis()).set(breakerKey(platform), "1", "PX", cooldownMs);
    },
    async () => {
      logger.warn(`[${platform}] circuit cooldown over, resuming queue`);
      await queue.resume();
    }
  );

  const run = (job: Job): Promise<ProcessResult> =>
    platform === "codeforces" && job.name === "sync-batch"
      ? processCodeforcesBatch(job)
      : processSyncJob(job);

  const worker = new Worker(
    syncQueueName(platform),
    async (job) => {
      try {
        const result = await run(job);
        if (!result.neutral) breaker.record(true);
        return result;
      } catch (err: any) {
        if (isPermanentError(err)) {
          throw new UnrecoverableError(err.message); // no retries, straight to failed (DLQ)
        }
        breaker.record(false);
        throw err;
      }
    },
    {
      connection: bullConnection(),
      concurrency: pc.concurrency,
      limiter: { max: pc.rateMax, duration: pc.rateDurationMs },
      settings: {
        backoffStrategy: (attemptsMade, type) =>
          type === BACKOFF_TYPE ? computeBackoff(attemptsMade, cfg.backoffBaseMs, cfg.backoffMaxMs) : 0,
      },
    }
  );
  attachLogging(worker);
  return { worker, breaker };
}

/** After a crash during a breaker cooldown the queue would stay paused forever. */
export async function reconcileBreakerPauses(): Promise<void> {
  for (const platform of PLATFORM_NAMES) {
    const queue = getQueue(syncQueueName(platform));
    if (await queue.isPaused()) {
      const marker = await (await getConnectedRedis()).exists(breakerKey(platform));
      if (!marker) {
        logger.warn(`[${platform}] queue was paused without an active breaker, resuming`);
        await queue.resume();
      }
    }
  }
}

export interface WorkerHandle {
  close(): Promise<void>;
}

/** Starts every worker: per-platform sync, leaderboard, and the scheduler tick. */
export function startWorkers(): WorkerHandle {
  const syncs = PLATFORM_NAMES.map((p) => createSyncWorker(p));

  const leaderboard = new Worker(LEADERBOARD_QUEUE, async () => processLeaderboardJob(), {
    connection: bullConnection(),
    concurrency: 1,
  });
  const scheduler = new Worker(SCHEDULER_QUEUE, async () => runSchedulerTick(), {
    connection: bullConnection(),
    concurrency: 1,
  });
  attachLogging(leaderboard);
  attachLogging(scheduler);

  const workers = [...syncs.map((s) => s.worker), leaderboard, scheduler];
  return {
    async close() {
      syncs.forEach((s) => s.breaker.dispose());
      // Waits for in-flight jobs to finish.
      await Promise.all(workers.map((w) => w.close()));
    },
  };
}
