import { PLATFORM_NAMES, type PlatformName } from "../platforms/types.js";

const num = (key: string, fallback: number): number => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** Like num() but 0 is allowed (e.g. jitter off). */
const numOrZero = (key: string, fallback: number): number => {
  const v = Number(process.env[key]);
  return process.env[key] !== undefined && Number.isFinite(v) && v >= 0 ? v : fallback;
};

const HOUR_MS = 3_600_000;

// Defaults are deliberately gentle toward the real platforms.
const PLATFORM_DEFAULTS: Record<PlatformName, { concurrency: number; rateMax: number }> = {
  leetcode: { concurrency: 3, rateMax: 5 },
  codeforces: { concurrency: 1, rateMax: 2 },
  codechef: { concurrency: 2, rateMax: 3 },
};

/** Read lazily (not at import) so tests can set env per case. */
export function getQueueConfig() {
  return {
    syncIntervalMs: num("SYNC_INTERVAL_HOURS", 6) * HOUR_MS,
    /** Jobs are spread over [0, jitter) ms so a tick does not stampede the platforms. */
    syncJitterMs: numOrZero("SYNC_JITTER_SECONDS", 300) * 1000,
    leaderboardCron: process.env.LEADERBOARD_CRON || "0 1 * * *",
    attempts: num("SYNC_ATTEMPTS", 5),
    backoffBaseMs: num("SYNC_BACKOFF_BASE_MS", 5_000),
    backoffMaxMs: num("SYNC_BACKOFF_MAX_MS", 300_000),
    /** Max handles per Codeforces user.info call. */
    codeforcesBatchSize: num("CODEFORCES_BATCH_SIZE", 50),
    /** Accounts read from Postgres per page when enqueueing. */
    enqueuePageSize: num("ENQUEUE_PAGE_SIZE", 1000),
    breaker: {
      windowSize: num("BREAKER_WINDOW", 20),
      minSamples: num("BREAKER_MIN_SAMPLES", 10),
      failureThreshold: num("BREAKER_FAILURE_THRESHOLD", 0.5),
      cooldownMs: num("BREAKER_COOLDOWN_MS", 60_000),
    },
  };
}

export function platformConfig(platform: PlatformName) {
  const key = platform.toUpperCase();
  const d = PLATFORM_DEFAULTS[platform];
  return {
    concurrency: num(`SYNC_CONCURRENCY_${key}`, d.concurrency),
    rateMax: num(`RATE_LIMIT_${key}_MAX`, d.rateMax),
    rateDurationMs: num(`RATE_LIMIT_${key}_DURATION_MS`, 1000),
  };
}

export const syncQueueName = (p: PlatformName) => `sync-${p}`;
export const LEADERBOARD_QUEUE = "leaderboard";
export const SCHEDULER_QUEUE = "scheduler";

export const ALL_QUEUE_NAMES = [
  ...PLATFORM_NAMES.map(syncQueueName),
  LEADERBOARD_QUEUE,
  SCHEDULER_QUEUE,
];
