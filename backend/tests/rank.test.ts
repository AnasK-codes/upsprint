import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb, seedRankedUser, createUserWithCookie, prisma, ORIGIN } from "./helpers.js";
import { rebuildLeaderboard } from "../src/jobs/leaderboard.job.js";
import { competitionRanks } from "../src/utils/ranking.js";

describe("competitionRanks (pure)", () => {
  it("gives ties the same rank and skips the following ranks (1,2,2,4)", () => {
    expect(competitionRanks([10, 8, 8, 5], (s) => s, 0)).toEqual([1, 2, 2, 4]);
  });

  it("continues ties across a page boundary using firstRank", () => {
    // Page 2 (skip=2) starts inside a tie group whose first member ranked 2.
    expect(competitionRanks([8, 5], (s) => s, 2, 2)).toEqual([2, 4]);
  });

  it("treats composite keys as ties only when every part matches", () => {
    expect(competitionRanks([[5, 1], [5, 1], [5, 0]], (k) => k.join(":"), 0)).toEqual([1, 1, 3]);
  });
});

beforeEach(resetDb);

/**
 * Visible users (rating): u1 2000, u3 1800, u4 1800, u5 1700, u7 1600
 * Hidden (GROUPS_ONLY):   u2 1900, u6 1700
 * Expected visible ranks: 1, 2, 2, 4, 5
 */
async function seedMixed() {
  const u1 = await seedRankedUser({ email: "u1@x.test", rating: 2000, batch: "2024" });
  await seedRankedUser({ email: "u2@x.test", rating: 1900, visibility: "GROUPS_ONLY" });
  const u3 = await seedRankedUser({ email: "u3@x.test", rating: 1800, batch: "2025" });
  const u4 = await seedRankedUser({ email: "u4@x.test", rating: 1800, batch: "2024" });
  const u5 = await seedRankedUser({ email: "u5@x.test", rating: 1700, batch: "2025" });
  await seedRankedUser({ email: "u6@x.test", rating: 1700, visibility: "GROUPS_ONLY" });
  const u7 = await seedRankedUser({ email: "u7@x.test", rating: 1600, batch: "2024" });
  await rebuildLeaderboard();
  return { u1: u1.user, u3: u3.user, u4: u4.user, u5: u5.user, u7: u7.user };
}

async function listAll(path: string, limit = 2) {
  const out: { userId: number; rank: number }[] = [];
  for (let page = 1; page < 10; page++) {
    const res = await request(app).get(`${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`);
    expect(res.status).toBe(200);
    if (res.body.data.length === 0) break;
    for (const row of res.body.data) out.push({ userId: row.userId ?? row.user.id, rank: row.rank });
  }
  return out;
}

describe("global leaderboard rank consistency", () => {
  it("M15: /leaderboard/user/:id agrees with the user's rank in the paged list (0% inconsistent)", async () => {
    const users = await seedMixed();
    const list = await listAll("/leaderboard");

    let inconsistent = 0;
    for (const entry of list) {
      const res = await request(app).get(`/leaderboard/user/${entry.userId}`);
      if (res.body.rank !== entry.rank) inconsistent++;
    }
    const pct = (inconsistent / list.length) * 100;
    console.log(`M15 rank-consistency: ${inconsistent}/${list.length} inconsistent = ${pct}%`);

    expect(list.map((e) => e.userId)).toEqual(
      [users.u1.id, users.u3.id, users.u4.id, users.u5.id, users.u7.id].sort(
        (a, b) => list.findIndex((e) => e.userId === a) - list.findIndex((e) => e.userId === b),
      ),
    );
    expect(pct).toBe(0);
  });

  it("uses standard competition ranking for ties (1,2,2,4,5)", async () => {
    await seedMixed();
    const list = await listAll("/leaderboard");
    expect(list.map((e) => e.rank)).toEqual([1, 2, 2, 4, 5]);
  });

  it("hidden users never appear and do not take up ranks", async () => {
    await seedMixed();
    const top = await request(app).get("/leaderboard/top/10");
    expect(top.body.map((r: { rank: number }) => r.rank)).toEqual([1, 2, 2, 4, 5]);
  });

  it("filtered lists rank within the filtered set", async () => {
    // Semantics: with batch/branch filters the rank is the position inside the
    // filtered list, not the global rank.
    await seedMixed();
    const list = await listAll("/leaderboard?batch=2025");
    expect(list.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("re-ranks when a user switches to GROUPS_ONLY", async () => {
    const { cookie, userId } = await createUserWithCookie("me@x.test");
    const acc = await prisma.linkedAccount.create({ data: { userId, platform: "leetcode", username: "me" } });
    await prisma.platformSnapshot.create({ data: { linkedAccountId: acc.id, rating: 3000, problemsSolved: 1, rawData: {} } });
    await seedRankedUser({ email: "a@x.test", rating: 1800 });
    await seedRankedUser({ email: "b@x.test", rating: 1700 });
    await rebuildLeaderboard();
    expect((await listAll("/leaderboard")).map((e) => e.rank)).toEqual([1, 2, 3]);

    const res = await request(app)
      .patch("/users/leaderboard-visibility")
      .set("Cookie", cookie)
      .set("Origin", ORIGIN)
      .send({ visibility: "GROUPS_ONLY" });
    expect(res.status).toBe(200);

    const list = await listAll("/leaderboard");
    expect(list.map((e) => e.rank)).toEqual([1, 2]);
    for (const e of list) {
      expect((await request(app).get(`/leaderboard/user/${e.userId}`)).body.rank).toBe(e.rank);
    }
  });
});

describe("tie-aware ranks in other lists", () => {
  it("platform leaderboard ranks ties across pages (1,2 | 2,4 | 5)", async () => {
    await seedMixed();
    const list = await listAll("/leaderboard?platform=leetcode");
    expect(list.map((e) => e.rank)).toEqual([1, 2, 2, 4, 5]);
  });

  it("leetcode leaderboard ranks ties", async () => {
    await seedMixed();
    const list = await listAll("/leaderboard/leetcode");
    expect(list.map((e) => e.rank)).toEqual([1, 2, 2, 4, 5]);
  });

  it("daily-activity leaderboard ranks equal streaks together", async () => {
    await seedRankedUser({ email: "s1@x.test", rating: 1, currentStreak: 5, totalActiveDays: 10 });
    await seedRankedUser({ email: "s2@x.test", rating: 1, currentStreak: 5, totalActiveDays: 10 });
    await seedRankedUser({ email: "s3@x.test", rating: 1, currentStreak: 3, totalActiveDays: 9 });
    const res = await request(app).get("/leaderboard/daily-activity?limit=2&page=1");
    const res2 = await request(app).get("/leaderboard/daily-activity?limit=2&page=2");
    expect([...res.body.data, ...res2.body.data].map((r: { rank: number }) => r.rank)).toEqual([1, 1, 3]);
  });

  it("group leaderboard ranks equal values together", async () => {
    const { cookie, userId } = await createUserWithCookie("g@x.test");
    const b = await seedRankedUser({ email: "gb@x.test", rating: 1 });
    const c = await seedRankedUser({ email: "gc@x.test", rating: 1 });
    await prisma.leaderboard.createMany({
      data: [
        { userId, score: 10, rank: 1 },
        { userId: b.user.id, score: 10, rank: 2 },
        { userId: c.user.id, score: 5, rank: 3 },
      ],
    });
    const group = await prisma.group.create({ data: { name: "G", code: "TIE123" } });
    await prisma.groupMember.createMany({
      data: [userId, b.user.id, c.user.id].map((id) => ({ userId: id, groupId: group.id })),
    });
    const res = await request(app).get(`/groups/${group.id}/leaderboard`).set("Cookie", cookie);
    expect(res.body.data.map((r: { rank: number }) => r.rank)).toEqual([1, 1, 3]);
  });
});
