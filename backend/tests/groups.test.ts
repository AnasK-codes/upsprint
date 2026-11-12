import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma, resetDb, createUserWithCookie, ORIGIN } from "./helpers.js";
import { createGroup, getGroupLeaderboard } from "../src/services/group.service.js";
import * as inviteCode from "../src/utils/inviteCode.js";

process.env.TZ = "Asia/Kolkata"; // make local-vs-UTC bugs observable

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await resetDb();
});

describe("activity_today uses UTC days", () => {
  it("counts activity stored at today's UTC midnight even when the local date differs", async () => {
    // 20:00 UTC on Nov 12 is already Nov 13 in Asia/Kolkata.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T20:00:00Z"));

    const { userId } = await createUserWithCookie();
    const acc = await prisma.linkedAccount.create({ data: { userId, platform: "leetcode", username: "x" } });
    await prisma.dailyActivity.create({
      data: { linkedAccountId: acc.id, date: new Date("2026-11-12T00:00:00Z"), count: 7 },
    });
    const group = await prisma.group.create({ data: { name: "G", code: "UTC123" } });
    await prisma.groupMember.create({ data: { userId, groupId: group.id, role: "ADMIN" } });

    const rows = await getGroupLeaderboard(group.id, 1, 50, "activity_today");
    expect(rows[0].score).toBe(7);
  });
});

describe("invite codes", () => {
  it("are generated with crypto, not Math.random", async () => {
    const random = vi.spyOn(Math, "random");
    const { userId } = await createUserWithCookie();
    const group = await createGroup(userId, "Crypto group");
    expect(group.code).toMatch(/^[A-Z0-9]{6,}$/);
    expect(random).not.toHaveBeenCalled();
  });

  it("retry with a new code when the first collides", async () => {
    const { userId } = await createUserWithCookie();
    await prisma.group.create({ data: { name: "Existing", code: "AAAAAA" } });
    const gen = vi.spyOn(inviteCode, "generateInviteCode").mockReturnValueOnce("AAAAAA").mockReturnValueOnce("BBBBBB");

    const group = await createGroup(userId, "New group");

    expect(group.code).toBe("BBBBBB");
    expect(gen).toHaveBeenCalledTimes(2);
    expect(await prisma.groupMember.count({ where: { groupId: group.id, role: "ADMIN" } })).toBe(1);
  });

  it("give up after repeated collisions", async () => {
    const { userId } = await createUserWithCookie();
    await prisma.group.create({ data: { name: "Existing", code: "AAAAAA" } });
    vi.spyOn(inviteCode, "generateInviteCode").mockReturnValue("AAAAAA");
    await expect(createGroup(userId, "Never")).rejects.toThrow();
  });
});

describe("leaving a group", () => {
  const leave = (cookie: string, groupId: number) =>
    request(app).post(`/groups/${groupId}/leave`).set("Cookie", cookie).set("Origin", ORIGIN);

  async function setup() {
    const admin = await createUserWithCookie("admin@x.test");
    const older = await createUserWithCookie("older@x.test");
    const newer = await createUserWithCookie("newer@x.test");
    const group = await prisma.group.create({ data: { name: "Team", code: "LEAVE1" } });
    await prisma.groupMember.create({ data: { userId: admin.userId, groupId: group.id, role: "ADMIN", joinedAt: new Date("2026-01-01") } });
    await prisma.groupMember.create({ data: { userId: older.userId, groupId: group.id, joinedAt: new Date("2026-02-01") } });
    await prisma.groupMember.create({ data: { userId: newer.userId, groupId: group.id, joinedAt: new Date("2026-03-01") } });
    return { admin, older, newer, group };
  }

  it("promotes the oldest member when the last admin leaves", async () => {
    const { admin, older, newer, group } = await setup();
    expect((await leave(admin.cookie, group.id)).status).toBe(200);

    const roles = await prisma.groupMember.findMany({ where: { groupId: group.id } });
    expect(roles.find((m) => m.userId === older.userId)?.role).toBe("ADMIN");
    expect(roles.find((m) => m.userId === newer.userId)?.role).toBe("MEMBER");
  });

  it("does not promote anyone when another admin remains", async () => {
    const { admin, older, newer, group } = await setup();
    await prisma.groupMember.update({
      where: { userId_groupId: { userId: newer.userId, groupId: group.id } },
      data: { role: "ADMIN" },
    });
    await leave(admin.cookie, group.id);
    const o = await prisma.groupMember.findUniqueOrThrow({ where: { userId_groupId: { userId: older.userId, groupId: group.id } } });
    expect(o.role).toBe("MEMBER");
  });

  it("deletes the group when the last member leaves", async () => {
    const solo = await createUserWithCookie("solo@x.test");
    const group = await prisma.group.create({ data: { name: "Solo", code: "SOLO11" } });
    await prisma.groupMember.create({ data: { userId: solo.userId, groupId: group.id, role: "ADMIN" } });

    expect((await leave(solo.cookie, group.id)).status).toBe(200);
    expect(await prisma.group.findUnique({ where: { id: group.id } })).toBeNull();
  });
});
