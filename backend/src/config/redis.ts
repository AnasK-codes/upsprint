import { Redis } from "ioredis";
import logger from "../utils/logger.js";

let client: Redis | null = null;

/**
 * Lazily created shared Redis client. Returns null when REDIS_URL is unset
 * (Redis is optional until the queue work in Step 2.2 lands).
 *
 * The offline queue is disabled and retries are capped so a dead Redis fails
 * fast instead of hanging a health probe.
 */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    client.on("error", (err: Error) => {
      logger.warn("Redis error", { error: err.message });
    });
  }
  return client;
}

/** Shared client, connected on demand. Throws if REDIS_URL is unset or unreachable. */
export async function getConnectedRedis(): Promise<Redis> {
  const c = getRedis();
  if (!c) throw new Error("REDIS_URL is not set");
  if (c.status === "wait") await c.connect();
  return c;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  const c = client;
  client = null;
  try {
    await c.quit();
  } catch {
    c.disconnect();
  }
}
