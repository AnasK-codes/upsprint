import { beforeEach, describe, expect, it } from "vitest";
import crypto from "crypto";
import request from "supertest";
import passport from "passport";
import { app, prisma, resetDb, createUserWithCookie, ORIGIN } from "./helpers.js";
import { issueOAuthCode } from "../src/services/oauthCode.service.js";

beforeEach(resetDb);

describe("POST /auth/exchange", () => {
  it("trades a valid code for an httpOnly cookie that authenticates requests", async () => {
    const { userId } = await createUserWithCookie();
    const code = await issueOAuthCode(userId);

    const res = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0];
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const me = await request(app).get("/users/me").set("Cookie", cookie.split(";")[0]);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(userId);
  });

  it("is single use", async () => {
    const { userId } = await createUserWithCookie();
    const code = await issueOAuthCode(userId);

    const first = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code });
    const second = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code });

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(second.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects an expired code", async () => {
    const { userId } = await createUserWithCookie();
    const code = await issueOAuthCode(userId);
    await prisma.oAuthCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown code and a missing code", async () => {
    const unknown = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code: "nope" });
    const missing = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({});
    expect(unknown.status).toBe(400);
    expect(missing.status).toBe(400);
  });

  it("stores only a hash of the code, with roughly a 60s lifetime", async () => {
    const { userId } = await createUserWithCookie();
    const code = await issueOAuthCode(userId);

    const row = await prisma.oAuthCode.findFirstOrThrow();
    expect(row.codeHash).not.toBe(code);
    expect(row.codeHash).toBe(crypto.createHash("sha256").update(code).digest("hex"));
    const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
    expect(ttl).toBeGreaterThan(50_000);
    expect(ttl).toBeLessThanOrEqual(61_000);
  });
});

describe("GET /auth/google/callback", () => {
  // Replace the real Google strategy with one that always authenticates a fixed user.
  const useFakeGoogle = (userId: number) => {
    passport.use("google", {
      name: "google",
      authenticate(this: { success: (u: unknown) => void }) {
        this.success({ id: userId });
      },
    } as never);
  };

  it("redirects with a one-time code, never the JWT, and sets no cookie", async () => {
    const { userId } = await createUserWithCookie();
    useFakeGoogle(userId);

    const res = await request(app)
      .get("/auth/google/callback?state=abc&code=google-code")
      .set("Cookie", "oauth_state=abc");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname).toBe("/oauth-success");
    expect(location.searchParams.get("token")).toBeNull();
    expect(res.headers.location).not.toMatch(/eyJ/);
    expect(((res.headers["set-cookie"] as unknown as string[] | undefined)?.join(";") ?? "")).not.toMatch(/token=[^;]/);

    // The code in the URL is redeemable exactly once.
    const code = location.searchParams.get("code")!;
    const ok = await request(app).post("/auth/exchange").set("Origin", ORIGIN).send({ code });
    expect(ok.status).toBe(200);
  });

  it("rejects a state mismatch", async () => {
    const res = await request(app)
      .get("/auth/google/callback?state=evil")
      .set("Cookie", "oauth_state=abc");
    expect(res.status).toBe(403);
  });
});
