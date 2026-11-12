import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("POST /auth/register", () => {
  it("creates a user and sets the token cookie", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@example.test", password: "password123", name: "A" });

    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
    // The JWT must never appear in the response body.
    expect(JSON.stringify(res.body)).not.toMatch(/token|eyJ/);
  });

  it("rejects a duplicate email with 409", async () => {
    const body = { email: "a@example.test", password: "password123" };
    await request(app).post("/auth/register").send(body);
    const res = await request(app).post("/auth/register").send(body);
    expect(res.status).toBe(409);
  });

  it("rejects missing fields with 400", async () => {
    const res = await request(app).post("/auth/register").send({ email: "a@example.test" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "a@example.test", password: "password123" });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@example.test", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("a@example.test");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/token|eyJ/);
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@example.test", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown user with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.test", password: "password123" });
    expect(res.status).toBe(401);
  });
});
