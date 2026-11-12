import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, prisma, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("GET /leaderboard", () => {
  it("returns an empty page when nobody is ranked", async () => {
    const res = await request(app).get("/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 1, limit: 50, data: [] });
  });

  it("lists ranked users and hides users who opted out", async () => {
    const visible = await prisma.user.create({
      data: { email: "visible@example.test", name: "Visible" },
    });
    const hidden = await prisma.user.create({
      data: { email: "hidden@example.test", name: "Hidden", leaderboardVisibility: "GROUPS_ONLY" },
    });
    await prisma.leaderboard.createMany({
      data: [
        { userId: visible.id, score: 90, rank: 1 },
        { userId: hidden.id, score: 95, rank: 2 },
      ],
    });

    const res = await request(app).get("/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ userId: visible.id, rank: 1, score: 90 });
  });

  it("rejects an invalid batch year with 400", async () => {
    const res = await request(app).get("/leaderboard?batch=abc");
    expect(res.status).toBe(400);
  });
});
