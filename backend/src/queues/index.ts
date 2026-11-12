import { Queue, type JobsOptions } from "bullmq";
import { bullConnection } from "./connection.js";
import { BACKOFF_TYPE } from "./backoff.js";
import {
  ALL_QUEUE_NAMES,
  LEADERBOARD_QUEUE,
  SCHEDULER_QUEUE,
  getQueueConfig,
} from "./config.js";

const queues = new Map<string, Queue>();

function defaultJobOptions(name: string): JobsOptions {
  const cfg = getQueueConfig();
  if (name === SCHEDULER_QUEUE) {
    return { attempts: 1, removeOnComplete: { count: 20 }, removeOnFail: { count: 100 } };
  }
  return {
    attempts: name === LEADERBOARD_QUEUE ? 3 : cfg.attempts,
    backoff: { type: BACKOFF_TYPE, delay: cfg.backoffBaseMs },
    // Completed jobs are kept for one sync interval: their ids are what makes
    // `jobId = accountId-window` de-duplication work across scheduler replicas.
    removeOnComplete: { age: Math.ceil(cfg.syncIntervalMs / 1000) },
    // Failed jobs that exhausted their attempts stay here: this is our DLQ.
    removeOnFail: { age: 7 * 24 * 3600 },
  };
}

/** Shared Queue handle (producer side) for the given queue name. */
export function getQueue(name: string): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: bullConnection(),
      defaultJobOptions: defaultJobOptions(name),
    });
    q.on("error", () => {
      /* connection errors are surfaced by health checks; avoid unhandled 'error' */
    });
    queues.set(name, q);
  }
  return q;
}

export async function closeQueues(): Promise<void> {
  const all = [...queues.values()];
  queues.clear();
  await Promise.all(all.map((q) => q.close().catch(() => undefined)));
}

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  /** True while the queue is paused (e.g. by the circuit breaker). */
  paused: boolean;
}

/** Job counts per queue; `failed` is the dead-letter count. */
export async function getQueueCounts(): Promise<Record<string, QueueCounts>> {
  const entries = await Promise.all(
    ALL_QUEUE_NAMES.map(async (name) => {
      const q = getQueue(name);
      const [c, paused] = await Promise.all([
        q.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
        q.isPaused(),
      ]);
      return [name, { ...(c as Omit<QueueCounts, "paused">), paused }] as const;
    })
  );
  return Object.fromEntries(entries);
}
