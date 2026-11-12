import request from "supertest";
import prisma from "../src/config/db.js";
import app from "../src/app.js";
import { generateToken } from "../src/controllers/auth.controller.js";
import { clearCachePrefix } from "../src/utils/cache.js";

export { app, prisma };

/** Matches FRONTEND_URL in setupEnv; browsers send this Origin on state-changing requests. */
export const ORIGIN = "http://localhost:3000";

/** Create a user straight in the DB and return a valid auth cookie (no HTTP, no rate limiter). */
export async function createUserWithCookie(email = "user@example.test") {
  const user = await prisma.user.create({ data: { email, name: "Test User" } });
  return { userId: user.id, cookie: `token=${generateToken(user.id)}` };
}

/** Empty every table (except Prisma's migration table) and the in-memory cache. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  clearCachePrefix("leaderboard:");
}

/** Register a user through the API and return the auth cookie for later requests. */
export async function registerUser(email = "user@example.test", password = "password123") {
  const res = await request(app).post("/auth/register").send({ email, password, name: "Test User" });
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith("token="))?.split(";")[0];
  if (res.status !== 201 || !cookie) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { cookie, userId: user.id };
}

/** Create a user with one linked account and one snapshot (for leaderboard tests). */
export async function seedRankedUser(opts: {
  email: string;
  rating: number;
  platform?: string;
  visibility?: "GLOBAL_AND_GROUPS" | "GROUPS_ONLY";
  batch?: string;
  problemsSolved?: number;
  currentStreak?: number;
  totalActiveDays?: number;
}) {
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.email.split("@")[0],
      batch: opts.batch,
      leaderboardVisibility: opts.visibility ?? "GLOBAL_AND_GROUPS",
    },
  });
  const account = await prisma.linkedAccount.create({
    data: {
      userId: user.id,
      platform: opts.platform ?? "leetcode",
      username: opts.email.split("@")[0],
      currentStreak: opts.currentStreak ?? 0,
      totalActiveDays: opts.totalActiveDays ?? 0,
    },
  });
  await prisma.platformSnapshot.create({
    data: {
      linkedAccountId: account.id,
      rating: opts.rating,
      problemsSolved: opts.problemsSolved ?? 100,
      rawData: {},
    },
  });
  return { user, account };
}
