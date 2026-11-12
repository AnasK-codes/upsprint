import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, ORIGIN } from "./helpers.js";
import { generateToken } from "../src/controllers/auth.controller.js";

const cookie = `token=${generateToken(1)}`;

describe("CSRF Origin check", () => {
  it("blocks a state-changing request from a foreign Origin", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .set("Origin", "https://evil.example")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("blocks a foreign Referer when Origin is absent", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .set("Referer", "https://evil.example/page")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("blocks a cookie-bearing request that has neither Origin nor Referer", async () => {
    const res = await request(app).post("/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("allows the configured frontend Origin", async () => {
    const res = await request(app).post("/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("allows cookie-less non-browser requests and never blocks GET", async () => {
    const noCookie = await request(app).post("/auth/logout");
    const get = await request(app).get("/leaderboard").set("Origin", "https://evil.example");
    expect(noCookie.status).toBe(200);
    expect(get.status).toBe(200);
  });
});
