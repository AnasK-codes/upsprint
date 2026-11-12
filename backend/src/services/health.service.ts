import prisma from "../config/db.js";
import { getRedis } from "../config/redis.js";

const CHECK_TIMEOUT_MS = 2000;

export type CheckStatus = "ok" | "fail" | "skipped";

export interface ReadinessResult {
  ready: boolean;
  checks: { database: CheckStatus; redis: CheckStatus };
}

let shuttingDown = false;

/** Flip readiness to failing so load balancers stop routing during drain. */
export function markShuttingDown(): void {
  shuttingDown = true;
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("health check timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function checkDatabase(): Promise<CheckStatus> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "fail";
  }
}

async function checkRedis(): Promise<CheckStatus> {
  const redis = getRedis();
  if (!redis) return "skipped";
  try {
    if (redis.status === "wait") await withTimeout(redis.connect(), CHECK_TIMEOUT_MS);
    await withTimeout(redis.ping(), CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "fail";
  }
}

export async function checkReadiness(): Promise<ReadinessResult> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const ready = !shuttingDown && database === "ok" && redis !== "fail";
  return { ready, checks: { database, redis } };
}
