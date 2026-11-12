import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Redis } from "ioredis";
import { prisma } from "../helpers.js";
import { closeQueues } from "../../src/queues/index.js";

export const redisUrl = () => process.env.TEST_REDIS_URL!;

export interface MockServer {
  url: string;
  stats(): Promise<{ total: number; errors: number; leetcode: number; codeforces: number; codechef: number }>;
  control(c: { failNext?: number; failStatus?: number; latencyMs?: number | null }): Promise<void>;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

/** Starts benchmarks/mock-platforms/server.mjs on a free port. Never touches real platforms. */
export async function startMock(): Promise<MockServer> {
  const port = 41000 + Math.floor(Math.random() * 2000);
  const script = path.resolve(process.cwd(), "../benchmarks/mock-platforms/server.mjs");
  const child: ChildProcess = spawn(process.execPath, [script], {
    env: { ...process.env, MOCK_PORT: String(port), MOCK_LATENCY_MS: "0", MOCK_ERROR_RATE: "0" },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${url}/__health`)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const post = (p: string, body?: unknown) =>
    fetch(`${url}${p}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  return {
    url,
    stats: async () => (await fetch(`${url}/__stats`)).json(),
    control: async (c) => void (await post("/__control", c)),
    reset: async () => void (await post("/__reset")),
    stop: async () => {
      child.kill();
    },
  };
}

/** Point the app at Redis and the mock, with fast, deterministic queue settings. */
export function useQueueEnv(mockUrl: string, overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    REDIS_URL: redisUrl(),
    LEETCODE_BASE_URL: mockUrl,
    CODEFORCES_BASE_URL: mockUrl,
    CODECHEF_BASE_URL: mockUrl,
    SYNC_JITTER_SECONDS: "0",
    SYNC_BACKOFF_BASE_MS: "20",
    SYNC_BACKOFF_MAX_MS: "100",
    SYNC_ATTEMPTS: "3",
    RATE_LIMIT_LEETCODE_MAX: "1000",
    RATE_LIMIT_CODEFORCES_MAX: "1000",
    RATE_LIMIT_CODECHEF_MAX: "1000",
    BREAKER_MIN_SAMPLES: "1000", // effectively off unless a test sets it
    ...overrides,
  });
}

export async function flushRedis() {
  const r = new Redis(redisUrl());
  await r.flushall();
  await r.quit();
}

export async function resetQueues() {
  await closeQueues();
  await flushRedis();
}

export async function waitFor<T>(fn: () => Promise<T | false | undefined>, timeoutMs = 15_000, what = "condition"): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Create `n` users, each with one linked account on `platform` named `${prefix}${i}`. */
export async function seedAccounts(platform: string, n: number, prefix = `${platform}_u`) {
  const existing = await prisma.user.count();
  await prisma.user.createMany({
    data: Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}-${existing}@x.test`, name: `${prefix}${i}` })),
  });
  const users = await prisma.user.findMany({ orderBy: { id: "desc" }, take: n });
  await prisma.linkedAccount.createMany({
    data: users.reverse().map((u, i) => ({ userId: u.id, platform, username: `${prefix}${i}` })),
  });
  return prisma.linkedAccount.findMany({
    where: { platform, username: { startsWith: prefix }, userId: { in: users.map((u) => u.id) } },
    orderBy: { id: "asc" },
  });
}
