import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import axios from "axios";
import { app, prisma, resetDb, createUserWithCookie, ORIGIN } from "./helpers.js";
import { fetchCodeforcesUser } from "../src/services/codeforces.service.js";
import { fetchLeetCodeProfile } from "../src/services/leetcode.service.js";
import { fetchCodeChefProfile } from "../src/services/codechef.service.js";
import { processAccountSnapshot } from "../src/jobs/snapshot.job.js";
import { USER_AGENT, HTTP_TIMEOUT_MS } from "../src/utils/http.js";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

beforeEach(async () => {
  vi.resetAllMocks();
  await resetDb();
});

const cfUser = { handle: "tourist", rating: 3500, maxRating: 3800, rank: "legendary grandmaster" };

describe("Codeforces service", () => {
  it("URL-encodes the handle", async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: [cfUser] } });
    await fetchCodeforcesUser("a b&handles=evil");
    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain(`handles=${encodeURIComponent("a b&handles=evil")}`);
    expect(url).not.toContain("handles=evil");
  });
});

describe("platform fetchers use a timeout and the shared User-Agent", () => {
  it("codeforces", async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: [cfUser] } });
    await fetchCodeforcesUser("tourist");
    const opts = mockedAxios.get.mock.calls[0][1] as { timeout?: number; headers?: Record<string, string> };
    expect(opts.timeout).toBe(HTTP_TIMEOUT_MS);
    expect(opts.headers?.["User-Agent"]).toBe(USER_AGENT);
  });

  it("leetcode", async () => {
    mockedAxios.post.mockRejectedValue(new Error("stop"));
    await fetchLeetCodeProfile("x").catch(() => {});
    const opts = mockedAxios.post.mock.calls[0][2] as { timeout?: number; headers?: Record<string, string> };
    expect(opts.timeout).toBe(HTTP_TIMEOUT_MS);
    expect(opts.headers?.["User-Agent"]).toBe(USER_AGENT);
  });

  it("codechef", async () => {
    mockedAxios.get.mockRejectedValue(new Error("stop"));
    await fetchCodeChefProfile("x").catch(() => {});
    const opts = mockedAxios.get.mock.calls[0][1] as { timeout?: number; headers?: Record<string, string> };
    expect(opts.timeout).toBe(HTTP_TIMEOUT_MS);
    expect(opts.headers?.["User-Agent"]).toBe(USER_AGENT);
  });

  it("the timeout is 10 seconds", () => {
    expect(HTTP_TIMEOUT_MS).toBe(10_000);
  });
});

describe("Codeforces snapshots", () => {
  it("job: stores null problemsSolved and keeps maxRating in rawData", async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: [cfUser] } });
    const { userId } = await createUserWithCookie();
    const acc = await prisma.linkedAccount.create({ data: { userId, platform: "codeforces", username: "tourist" } });

    await processAccountSnapshot(acc);

    const snap = await prisma.platformSnapshot.findFirstOrThrow();
    expect(snap.problemsSolved).toBeNull();
    expect((snap.rawData as { maxRating: number }).maxRating).toBe(3800);
    expect(snap.rating).toBe(3500);
  });

  it("route: POST /snapshots/codeforces/:id stores null problemsSolved", async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: [cfUser] } });
    const { userId, cookie } = await createUserWithCookie();
    const acc = await prisma.linkedAccount.create({ data: { userId, platform: "codeforces", username: "tourist" } });

    const res = await request(app).post(`/snapshots/codeforces/${acc.id}`).set("Cookie", cookie).set("Origin", ORIGIN);

    expect(res.status).toBe(200);
    const snap = await prisma.platformSnapshot.findFirstOrThrow();
    expect(snap.problemsSolved).toBeNull();
    expect((snap.rawData as { maxRating: number }).maxRating).toBe(3800);
  });
});
