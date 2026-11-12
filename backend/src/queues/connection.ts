import type { ConnectionOptions } from "bullmq";

/**
 * BullMQ connection options parsed from REDIS_URL. Passing options (not an
 * ioredis instance) lets BullMQ create and own its clients, and avoids type
 * clashes between ioredis versions. Workers require maxRetriesPerRequest=null.
 */
export function bullConnection(url = process.env.REDIS_URL): ConnectionOptions {
  if (!url) throw new Error("REDIS_URL is required for queues");
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
