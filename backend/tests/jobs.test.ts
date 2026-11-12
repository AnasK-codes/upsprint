import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, resetDb, seedRankedUser } from "./helpers.js";
import { runAllSnapshots } from "../src/jobs/snapshot.job.js";
import { rebuildLeaderboard } from "../src/jobs/leaderboard.job.js";

vi.mock("../src/services/leetcode.service.js", () => ({ fetchLeetCodeProfile: vi.fn().mockResolvedValue({
  username: "x", totalSolved: 1, easySolved: 1, mediumSolved: 0, hardSolved: 0, rating: 1500,
  globalRanking: null, submissionCalendar: {}, raw: {},
}) }));
vi.mock("../src/services/codeforces.service.js", () => ({ fetchCodeforcesUser: vi.fn() }));
vi.mock("../src/services/codechef.service.js", () => ({ fetchCodeChefProfile: vi.fn() }));

beforeEach(resetDb);

describe("JobRun recording", () => {
  it("records a successful snapshot run with start, finish and duration", async () => {
    await seedRankedUser({ email: "j@x.test", rating: 1 });
    await runAllSnapshots();

    const run = await prisma.jobRun.findFirstOrThrow({ where: { jobName: "snapshot" } });
    expect(run.status).toBe("success");
    expect(run.startedAt).toBeInstanceOf(Date);
    expect(run.finishedAt).toBeInstanceOf(Date);
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records a successful leaderboard rebuild", async () => {
    await seedRankedUser({ email: "j@x.test", rating: 1500 });
    await rebuildLeaderboard();

    const run = await prisma.jobRun.findFirstOrThrow({ where: { jobName: "leaderboard" } });
    expect(run.status).toBe("success");
    expect(run.finishedAt).not.toBeNull();
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records a failed run with the error message and rethrows", async () => {
    const spy = vi.spyOn(prisma.platformSnapshot, "findMany").mockRejectedValue(new Error("boom"));
    const queryRaw = vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("boom"));

    await expect(rebuildLeaderboard()).rejects.toThrow("boom");

    queryRaw.mockRestore();
    spy.mockRestore();
    const run = await prisma.jobRun.findFirstOrThrow({ where: { jobName: "leaderboard" } });
    expect(run.status).toBe("failed");
    expect(run.message).toContain("boom");
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
  });
});
