import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

afterEach(() => {
  delete process.env.METRICS_TOKEN;
});

describe("GET /metrics", () => {
  it("is disabled (404) when METRICS_TOKEN is not configured", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(404);
  });

  it("rejects a missing or wrong token", async () => {
    process.env.METRICS_TOKEN = "s3cret";
    const none = await request(app).get("/metrics");
    const wrong = await request(app).get("/metrics").set("Authorization", "Bearer nope");
    expect(none.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  it("serves metrics with the correct token", async () => {
    process.env.METRICS_TOKEN = "s3cret";
    const res = await request(app).get("/metrics").set("Authorization", "Bearer s3cret");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
  });
});
