import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { flushRedis, redisUrl } from "./helpers.js";

// Two separate module instances stand in for two API replicas. With the Redis
// store they must share one counter; the in-memory store would give each its own.
async function replica() {
  vi.resetModules();
  const mod = await import("../../src/middleware/rateLimit.middleware.js");
  const a = express();
  a.use(mod.apiLimiter);
  a.get("/x", (_req, res) => res.json({ ok: true }));
  return { app: a, close: mod.closeRateLimitRedis };
}

beforeAll(flushRedis);
afterAll(() => vi.unstubAllEnvs());

describe("Redis-backed API rate limiting", () => {
  it("shares the 60 req/min budget across replicas", async () => {
    vi.stubEnv("REDIS_URL", redisUrl());
    const r1 = await replica();
    const r2 = await replica();

    for (let i = 0; i < 40; i++) expect((await request(r1.app).get("/x")).status).toBe(200);
    for (let i = 0; i < 20; i++) expect((await request(r2.app).get("/x")).status).toBe(200);
    // 60 used in total across both replicas: the next one is refused on either.
    expect((await request(r2.app).get("/x")).status).toBe(429);
    expect((await request(r1.app).get("/x")).status).toBe(429);

    await Promise.all([r1.close(), r2.close()]);
  });

  it("falls back to the in-memory store without REDIS_URL", async () => {
    vi.stubEnv("REDIS_URL", "");
    const r = await replica();
    for (let i = 0; i < 60; i++) await request(r.app).get("/x");
    expect((await request(r.app).get("/x")).status).toBe(429);
  });
});
