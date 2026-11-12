import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb, createUserWithCookie, ORIGIN } from "./helpers.js";

let cookie: string;

beforeEach(async () => {
  await resetDb();
  ({ cookie } = await createUserWithCookie());
});

const post = (path: string, body: object) =>
  request(app).post(path).set("Cookie", cookie).set("Origin", ORIGIN).send(body);

describe("zod validation", () => {
  it("auth: rejects a malformed email and a short password", async () => {
    const badEmail = await request(app).post("/auth/register").send({ email: "not-an-email", password: "password123" });
    const shortPw = await request(app).post("/auth/register").send({ email: "a@example.test", password: "123" });
    expect(badEmail.status).toBe(400);
    expect(shortPw.status).toBe(400);
    expect(Array.isArray(badEmail.body.errors)).toBe(true);
    expect(typeof badEmail.body.message).toBe("string");
  });

  it("auth: rejects an invalid branch/batch on register", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "b@example.test", password: "password123", branch: "XYZ", batch: "20" });
    expect(res.status).toBe(400);
  });

  it("users: rejects bad profile, visibility and connect bodies", async () => {
    const profile = await request(app).put("/users/me").set("Cookie", cookie).set("Origin", ORIGIN).send({ branch: "XYZ" });
    const visibility = await request(app).patch("/users/leaderboard-visibility").set("Cookie", cookie).set("Origin", ORIGIN).send({ visibility: "EVERYONE" });
    const platform = await post("/users/accounts/connect", { platform: "myspace", username: "x" });
    const missing = await post("/users/accounts/connect", { platform: "leetcode" });
    expect([profile.status, visibility.status, platform.status, missing.status]).toEqual([400, 400, 400, 400]);
  });

  it("users: rejects a non-numeric account id", async () => {
    const res = await request(app).delete("/users/accounts/abc").set("Cookie", cookie).set("Origin", ORIGIN);
    expect(res.status).toBe(400);
  });

  it("groups: validates create/join bodies and params", async () => {
    const short = await post("/groups", { name: "ab" });
    const missing = await post("/groups", {});
    const join = await post("/groups/join", { code: "" });
    const badId = await request(app).get("/groups/abc/members").set("Cookie", cookie);
    const badMetric = await request(app).get("/groups/1/leaderboard?metric=bogus").set("Cookie", cookie);
    expect([short.status, missing.status, join.status, badId.status, badMetric.status]).toEqual([400, 400, 400, 400, 400]);
  });

  it("leaderboard: validates filters, pagination and params", async () => {
    const badBranch = await request(app).get("/leaderboard?branch=XYZ");
    const badPlatform = await request(app).get("/leaderboard?platform=myspace");
    const badPage = await request(app).get("/leaderboard?page=abc");
    const badUser = await request(app).get("/leaderboard/user/abc");
    const badTop = await request(app).get("/leaderboard/top/0");
    expect([badBranch.status, badPlatform.status, badPage.status, badUser.status, badTop.status]).toEqual([400, 400, 400, 400, 400]);
  });

  it("leaderboard: still accepts valid filters and clamps limit", async () => {
    const res = await request(app).get("/leaderboard?batch=2025&branch=CSE&platform=all&page=2&limit=500");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, limit: 100 });
  });
});
