import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";
import logger from "../utils/logger.js";

let client: Redis | null = null;

/**
 * With REDIS_URL set, limiter counters live in Redis so limits hold across API
 * replicas. Without it (local dev, tests) each limiter uses its in-memory store.
 * If Redis fails at request time the limiter fails open (passOnStoreError)
 * rather than turning a Redis outage into an API outage.
 */
function store(prefix: string): RedisStore | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 1 });
    client.on("error", (err: Error) => logger.warn("Rate limit Redis error", { error: err.message }));
  }
  const c = client;
  return new RedisStore({
    prefix: `upsprint:rl:${prefix}:`,
    sendCommand: (...args: string[]) => c.call(args[0], ...args.slice(1)) as Promise<any>,
  });
}

export async function closeRateLimitRedis(): Promise<void> {
  const c = client;
  client = null;
  if (c) await c.quit().catch(() => c.disconnect());
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many requests from this IP, please try again later" },
  skip: () => process.env.BENCH_DISABLE_RATE_LIMIT === "true",
  store: store("api"),
  passOnStoreError: true,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many login/register attempts, please try again later" },
  store: store("auth"),
  passOnStoreError: true,
});

export const snapshotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { message: "Too many snapshot requests, please wait a moment" },
  store: store("snapshot"),
  passOnStoreError: true,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Too many requests, please try again later" },
  store: store("strict"),
  passOnStoreError: true,
});
