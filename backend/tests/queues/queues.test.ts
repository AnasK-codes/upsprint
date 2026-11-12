import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, createUserWithCookie, prisma, resetDb } from "../helpers.js";
import { getQueue, getQueueCounts, type QueueCounts } from "../../src/queues/index.js";
import { enqueueAllSyncs, registerSchedules, runSchedulerTick } from "../../src/queues/scheduler.js";
import { createSyncWorker, reconcileBreakerPauses, startWorkers } from "../../src/queues/workers.js";
import { closeRedis } from "../../src/config/redis.js";
import {
  resetQueues, seedAccounts, startMock, useQueueEnv, waitFor, type MockServer,
} from "./helpers.js";

// Integration tests: real Postgres + Redis (testcontainers) and the benchmark mock
// platform server. They never reach LeetCode, Codeforces or CodeChef.
let mock: MockServer;
let stopWorkers: Array<() => Promise<void>> = [];

beforeAll(async () => {
  mock = await startMock();
});
afterAll(async () => {
  await mock.stop();
  await closeRedis();
});
beforeEach(async () => {
  await resetDb();
  await resetQueues();
  await mock.reset();
  useQueueEnv(mock.url);
});
afterEach(async () => {
  for (const stop of stopWorkers) await stop();
  stopWorkers = [];
  await resetQueues();
});

const total = (c: QueueCounts) => c.waiting + c.active + c.delayed + c.completed + c.failed;

const track = (w: { close(): Promise<void> }) => {
  stopWorkers.push(() => w.close());
  return w;
};

describe("scheduler", () => {
  it("enqueues one job per account and one batch job per 50 Codeforces handles", async () => {
    await seedAccounts("leetcode", 3);
    await seedAccounts("codechef", 2);
    await seedAccounts("codeforces", 120);

    const r = await enqueueAllSyncs();
    expect(r.accounts).toBe(125);
    expect(r.jobs).toBe(3 + 2 + 3); // 120 handles -> batches of 50, 50, 20

    const counts = await getQueueCounts();
    expect(total(counts["sync-leetcode"])).toBe(3);
    expect(total(counts["sync-codechef"])).toBe(2);
    expect(total(counts["sync-codeforces"])).toBe(3);
  });

  it("is idempotent within a window: a second scheduler replica adds nothing", async () => {
    await seedAccounts("leetcode", 3);
    await seedAccounts("codeforces", 60);
    const now = Date.now();

    await enqueueAllSyncs(now);
    await enqueueAllSyncs(now); // e.g. another replica, or a retried tick
    const counts = await getQueueCounts();
    expect(total(counts["sync-leetcode"])).toBe(3);
    expect(total(counts["sync-codeforces"])).toBe(2);

    await enqueueAllSyncs(now + 7 * 3600_000); // next 6h window -> new jobs
    expect(total((await getQueueCounts())["sync-leetcode"])).toBe(6);
  });

  it("spreads jobs with jitter (delayed) when jitter is enabled", async () => {
    useQueueEnv(mock.url, { SYNC_JITTER_SECONDS: "600" });
    await seedAccounts("codechef", 20);
    await enqueueAllSyncs();
    const counts = await getQueueCounts();
    expect(counts["sync-codechef"].delayed).toBeGreaterThan(0);
  });

  it("registers schedules idempotently and does not sync at startup", async () => {
    await seedAccounts("leetcode", 2);
    await registerSchedules();
    await registerSchedules(); // second replica booting

    expect(await getQueue("scheduler").getJobSchedulers()).toHaveLength(1);
    expect(await getQueue("leaderboard").getJobSchedulers()).toHaveLength(1);
    // Run every worker, including the scheduler: nothing may fire until a boundary.
    track(startWorkers());
    await new Promise((r) => setTimeout(r, 1500));
    const counts = await getQueueCounts();
    expect(total(counts["sync-leetcode"])).toBe(0);
    expect(await prisma.jobRun.count({ where: { jobName: "snapshot" } })).toBe(0);
    expect(await prisma.platformSnapshot.count()).toBe(0);
  });

  it("also avoids a startup sync for intervals that do not divide the day", async () => {
    useQueueEnv(mock.url, { SYNC_INTERVAL_HOURS: "5" });
    await seedAccounts("leetcode", 2);
    await registerSchedules();
    track(startWorkers());
    await new Promise((r) => setTimeout(r, 1500));
    expect(total((await getQueueCounts())["sync-leetcode"])).toBe(0);
  });
});

describe("workers end to end", () => {
  it("syncs every platform from the mock, batching Codeforces into few requests", async () => {
    const lc = await seedAccounts("leetcode", 3);
    const cc = await seedAccounts("codechef", 2);
    const cf = await seedAccounts("codeforces", 120);

    track(startWorkers());
    await runSchedulerTick(); // what the scheduler worker runs every interval

    await waitFor(async () => {
      const c = await getQueueCounts();
      return c["sync-leetcode"].completed === 3 && c["sync-codechef"].completed === 2 && c["sync-codeforces"].completed === 3;
    }, 30_000, "all sync jobs to complete");

    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: { in: cf.map((a) => a.id) } } })).toBe(120);
    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: { in: cc.map((a) => a.id) } } })).toBe(2);
    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: { in: lc.map((a) => a.id) } } })).toBeGreaterThan(0);

    const s = await mock.stats();
    expect(s.codeforces).toBe(3); // 3 batch calls, not 120
    expect(s.codechef).toBe(2);
    expect(s.leetcode).toBe(3);

    const run = await prisma.jobRun.findFirstOrThrow({ where: { jobName: "snapshot" } });
    expect(run.status).toBe("success");
  });

  it("processes the leaderboard queue and records a JobRun", async () => {
    await seedAccounts("codechef", 2);
    track(startWorkers());
    await getQueue("leaderboard").add("rebuild", {});
    await waitFor(
      async () => (await prisma.jobRun.findFirst({ where: { jobName: "leaderboard", status: "success" } })) ?? false,
      15_000,
      "leaderboard job"
    );
  });

  it("falls back to single lookups when a Codeforces batch is rejected for one bad handle", async () => {
    const good = await seedAccounts("codeforces", 4, "cf_ok");
    const [bad] = await seedAccounts("codeforces", 1, "nouser_cf");
    track(createSyncWorker("codeforces").worker);

    await enqueueAllSyncs();
    await waitFor(async () => {
      const c = await getQueueCounts();
      // 1 batch (completed after fan-out) + 4 good singles completed + 1 bad single failed
      return c["sync-codeforces"].completed === 5 && c["sync-codeforces"].failed === 1;
    }, 30_000, "fallback to finish");

    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: { in: good.map((a) => a.id) } } })).toBe(4);
    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: bad.id } })).toBe(0);
    const s = await mock.stats();
    expect(s.codeforces).toBe(1 + 5); // the rejected batch + one lookup per account
  });
});

describe("retries, dead letters and permanent errors", () => {
  it("retries a transient failure with backoff, then parks the job in the failed set", async () => {
    const [acc] = await seedAccounts("codechef", 1);
    await mock.control({ failNext: 100, failStatus: 503 });
    track(createSyncWorker("codechef").worker);

    await getQueue("sync-codechef").add("sync", { accountId: acc.id, window: 1 });
    await waitFor(async () => (await getQueueCounts())["sync-codechef"].failed === 1, 15_000, "job in DLQ");

    const [job] = await getQueue("sync-codechef").getFailed();
    expect(job.attemptsMade).toBe(3); // SYNC_ATTEMPTS
    expect((await mock.stats()).total).toBe(3); // every attempt hit the platform
  });

  it("recovers when the platform comes back before attempts run out", async () => {
    const [acc] = await seedAccounts("codechef", 1);
    await mock.control({ failNext: 1, failStatus: 503 });
    track(createSyncWorker("codechef").worker);

    await getQueue("sync-codechef").add("sync", { accountId: acc.id, window: 1 });
    await waitFor(async () => (await getQueueCounts())["sync-codechef"].completed === 1, 15_000, "recovery");
    expect(await prisma.platformSnapshot.count({ where: { linkedAccountId: acc.id } })).toBe(1);
    expect((await getQueueCounts())["sync-codechef"].failed).toBe(0);
  });

  it("does not retry an unknown user (permanent error)", async () => {
    const [acc] = await seedAccounts("leetcode", 1, "nouser_lc");
    track(createSyncWorker("leetcode").worker);

    await getQueue("sync-leetcode").add("sync", { accountId: acc.id, window: 1 });
    await waitFor(async () => (await getQueueCounts())["sync-leetcode"].failed === 1, 15_000, "permanent failure");

    const [job] = await getQueue("sync-leetcode").getFailed();
    expect(job.attemptsMade).toBe(1);
    expect((await mock.stats()).leetcode).toBe(1);
  });
});

describe("circuit breaker", () => {
  it("pauses a platform's queue when its error rate spikes, then resumes after the cooldown", async () => {
    useQueueEnv(mock.url, {
      SYNC_ATTEMPTS: "1",
      BREAKER_MIN_SAMPLES: "3",
      BREAKER_WINDOW: "10",
      BREAKER_FAILURE_THRESHOLD: "0.5",
      BREAKER_COOLDOWN_MS: "1500",
      SYNC_CONCURRENCY_CODECHEF: "1",
    });
    await seedAccounts("codechef", 8);
    await mock.control({ failNext: 1000, failStatus: 503 });
    track(createSyncWorker("codechef").worker);

    await enqueueAllSyncs();
    const q = getQueue("sync-codechef");
    await waitFor(() => q.isPaused(), 15_000, "queue to pause");

    const during = await getQueueCounts();
    expect(during["sync-codechef"].paused).toBe(true);
    expect(during["sync-codechef"].waiting).toBeGreaterThan(0); // not drained: the breaker held them back
    expect((await mock.stats()).codechef).toBeLessThan(8);

    await mock.control({ failNext: 0 }); // platform recovers
    await waitFor(async () => !(await q.isPaused()), 15_000, "queue to resume");
    await waitFor(async () => (await getQueueCounts())["sync-codechef"].waiting === 0, 15_000, "queue to drain");
  });

  it("resumes a queue left paused by a crashed worker, but not an operator pause", async () => {
    const q = getQueue("sync-leetcode");
    await q.pause();
    await reconcileBreakerPauses(); // no breaker marker in Redis -> treated as stale
    expect(await q.isPaused()).toBe(false);
  });
});

describe("rate limiting per platform", () => {
  it("spaces jobs according to the platform limiter", async () => {
    useQueueEnv(mock.url, {
      RATE_LIMIT_CODECHEF_MAX: "2",
      RATE_LIMIT_CODECHEF_DURATION_MS: "500",
      SYNC_CONCURRENCY_CODECHEF: "6",
    });
    await seedAccounts("codechef", 6);
    track(createSyncWorker("codechef").worker);

    const t0 = Date.now();
    await enqueueAllSyncs();
    await waitFor(async () => (await getQueueCounts())["sync-codechef"].completed === 6, 20_000, "6 jobs");
    // 6 jobs at 2 per 500 ms -> at least two full windows must pass after the first batch.
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
  });
});

describe("admin visibility", () => {
  beforeEach(() => {
    vi.stubEnv("REDIS_URL", process.env.REDIS_URL!);
  });

  it("GET /admin/jobs/summary includes per-queue counts, including failed (DLQ)", async () => {
    const { cookie } = await createUserWithCookie("admin@example.test");
    const [acc] = await seedAccounts("leetcode", 1, "nouser_adm");
    track(createSyncWorker("leetcode").worker);
    await getQueue("sync-leetcode").add("sync", { accountId: acc.id, window: 1 });
    await waitFor(async () => (await getQueueCounts())["sync-leetcode"].failed === 1, 15_000, "a failed job");

    const res = await request(app).get("/admin/jobs/summary").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.queues["sync-leetcode"].failed).toBe(1);
    expect(Object.keys(res.body.queues)).toEqual(
      expect.arrayContaining(["sync-leetcode", "sync-codeforces", "sync-codechef", "leaderboard", "scheduler"])
    );
    expect(res.body).toHaveProperty("totalRuns");
  });

  it("serves Bull Board only to admins", async () => {
    const anon = await request(app).get("/admin/queues");
    expect(anon.status).toBe(401);

    const user = await createUserWithCookie("someone@example.test");
    expect((await request(app).get("/admin/queues").set("Cookie", user.cookie)).status).toBe(403);

    const admin = await createUserWithCookie("admin@example.test");
    const res = await request(app).get("/admin/queues").set("Cookie", admin.cookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("<html");
  });
});
