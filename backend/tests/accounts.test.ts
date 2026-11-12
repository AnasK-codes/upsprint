import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma, registerUser, resetDb, ORIGIN } from "./helpers.js";
import { fetchLeetCodeProfile } from "../src/services/leetcode.service.js";

// Platform services are mocked: tests never reach LeetCode, Codeforces or CodeChef.
vi.mock("../src/services/leetcode.service.js", () => ({ fetchLeetCodeProfile: vi.fn() }));
vi.mock("../src/services/codeforces.service.js", () => ({ fetchCodeforcesUser: vi.fn() }));
vi.mock("../src/services/codechef.service.js", () => ({ fetchCodeChefProfile: vi.fn() }));

const mockedLeetCode = vi.mocked(fetchLeetCodeProfile);

beforeEach(async () => {
  await resetDb();
  mockedLeetCode.mockReset();
});

describe("POST /users/accounts/connect", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/users/accounts/connect")
      .send({ platform: "leetcode", username: "alice" });
    expect(res.status).toBe(401);
  });

  it("connects an account, snapshots it and ranks the user", async () => {
    mockedLeetCode.mockResolvedValue({
      username: "alice",
      totalSolved: 120,
      easySolved: 60,
      mediumSolved: 50,
      hardSolved: 10,
      rating: 1600,
      globalRanking: 5000,
      // Activity today, so the snapshot job sees a change and writes a snapshot.
      submissionCalendar: { [String(Math.floor(Date.now() / 1000))]: 3 },
      raw: { mocked: true },
    });
    const { cookie, userId } = await registerUser();

    const res = await request(app)
      .post("/users/accounts/connect")
      .set("Cookie", cookie)
      .set("Origin", ORIGIN)
      .send({ platform: "leetcode", username: "alice" });

    expect(res.status).toBe(201);
    expect(mockedLeetCode).toHaveBeenCalledWith("alice");

    const list = await request(app).get("/users/accounts").set("Cookie", cookie);
    expect(list.body).toEqual([expect.objectContaining({ platform: "leetcode", username: "alice" })]);
    expect(await prisma.platformSnapshot.count()).toBe(1);
    expect(await prisma.leaderboard.findUnique({ where: { userId } })).not.toBeNull();
  });

  // KNOWN BUG (out of scope for step 1.1): processAccountSnapshot() catches and logs
  // every error, so connectAccount never sees the failure and returns 201 for
  // invalid usernames. `it.fails` passes while the bug exists and starts failing
  // once it is fixed, at which point change it to a plain `it`.
  it.fails("rolls the account back with 400 when the platform fetch fails", async () => {
    mockedLeetCode.mockRejectedValue(new Error("User not found"));
    const { cookie } = await registerUser();

    const res = await request(app)
      .post("/users/accounts/connect")
      .set("Cookie", cookie)
      .set("Origin", ORIGIN)
      .send({ platform: "leetcode", username: "ghost" });

    expect(res.status).toBe(400);
    expect(await prisma.linkedAccount.count()).toBe(0);
  });

  it("rejects connecting the same platform twice", async () => {
    mockedLeetCode.mockResolvedValue({
      username: "alice", totalSolved: 1, easySolved: 1, mediumSolved: 0, hardSolved: 0,
      rating: null, globalRanking: null, submissionCalendar: {}, raw: {},
    });
    const { cookie } = await registerUser();
    const body = { platform: "leetcode", username: "alice" };

    await request(app).post("/users/accounts/connect").set("Cookie", cookie).set("Origin", ORIGIN).send(body);
    const res = await request(app).post("/users/accounts/connect").set("Cookie", cookie).set("Origin", ORIGIN).send(body);

    expect(res.status).toBe(400);
  });
});
