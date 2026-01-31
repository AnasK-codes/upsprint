import { Prisma } from "@prisma/client";
import prisma from "../config/db.js";

/**
 * Row shape returned by the raw SQL helper.
 * Matches SELECT in fetchLatestSnapshotsWithAccountUser()
 */
export type LatestSnapshotRow = {
  id: number;
  linkedAccountId: number;
  rating: number | null;
  rankTitle: string | null;
  problemsSolved: number | null;
  rawData: any;
  createdAt: string;
  platform: string;
  userId: number;
};

/**
 * Fetch the latest PlatformSnapshot row for each linked account,
 * including the linked account.platform and the userId.
 *
 * This uses a single SQL query to avoid N+1 queries.
 */
export async function fetchLatestSnapshotsWithAccountUser(): Promise<
  LatestSnapshotRow[]
> {
  const rows: LatestSnapshotRow[] = await prisma.$queryRaw`
    SELECT
      ps.id,
      ps."linkedAccountId",
      ps.rating,
      ps."rankTitle",
      ps."problemsSolved",
      ps."rawData",
      ps."createdAt",
      la.platform,
      la."userId"
    FROM "PlatformSnapshot" ps
    JOIN (
      SELECT "linkedAccountId", MAX("createdAt") AS maxc
      FROM "PlatformSnapshot"
      GROUP BY "linkedAccountId"
    ) latest
      ON ps."linkedAccountId" = latest."linkedAccountId"
      AND ps."createdAt" = latest.maxc
    JOIN "LinkedAccount" la ON la.id = ps."linkedAccountId";
  `;
  return rows;
}

/**
 * Normalizes a platform-specific rating to a 0-1 scale.
 * 
 * Logic:
 * - Codeforces: Max ~4000 (Grandmaster+)
 * - CodeChef: Max ~3500
 * - LeetCode: Max ~3000
 * 
 * We clamp the result to 1.0 to prevent outlier outliers from skewing the scale excessively.
 * @param platform - The platform name (case-insensitive)
 * @param ratingValue - The raw rating from the platform
 */
export function normalizeRating(platform: string, ratingValue: number): number {
  let max = 3000;
  if (platform.toLowerCase() === "codeforces") max = 4000;
  else if (platform.toLowerCase() === "codechef") max = 3500;

  if (!ratingValue) return 0;
  return Math.min(1, ratingValue / max);
}

export function computeScore(platform: string, ratingValue: number | null | undefined, weight = 1) {
  const rating = ratingValue ?? 0;
  const normalized = normalizeRating(platform, rating);
  return normalized * weight * 1000;
}

export async function getLeetCodeLeaderboard(
  page = 1,
  limit = 50,
  filters?: { batch?: string; branch?: string }
) {
  const skip = (page - 1) * limit;

  const batchFilter = filters?.batch
    ? Prisma.sql`AND u.batch = ${filters.batch}`
    : Prisma.empty;
  const branchFilter = filters?.branch
    ? Prisma.sql`AND u.branch = ${filters.branch}`
    : Prisma.empty;

  // Fetch latest LeetCode snapshots
  // We need to join User to get name/avatar
  // ordering by rating desc, then problemsSolved desc
  const rows = await prisma.$queryRaw`
    SELECT
      u.id as "userId",
      u.name,
      u."avatarUrl",
      ps.rating,
      ps."problemsSolved",
      ps."rankTitle",
      la.username as "handle"
    FROM "PlatformSnapshot" ps
    JOIN "LinkedAccount" la ON la.id = ps."linkedAccountId"
    JOIN "User" u ON u.id = la."userId"
    JOIN (
      SELECT "linkedAccountId", MAX("createdAt") AS maxc
      FROM "PlatformSnapshot"
      GROUP BY "linkedAccountId"
    ) latest
      ON ps."linkedAccountId" = latest."linkedAccountId"
      AND ps."createdAt" = latest.maxc
    WHERE la.platform = 'leetcode'
      ${batchFilter}
      ${branchFilter}
    ORDER BY ps.rating DESC NULLS LAST, ps."problemsSolved" DESC NULLS LAST
    OFFSET ${skip}
    LIMIT ${limit}
  `;



  // Map to LeaderboardEntry structure expected by frontend
  const mapped = (rows as any[]).map((row, index) => ({
    id: row.userId, // Use userId as the row ID
    rank: skip + index + 1,
    score: row.rating || 0,
    user: {
      id: row.userId,
      name: row.name || row.handle || "Unknown",
    },
  }));

  return mapped;
  return mapped;
}

/**
 * Generic leaderboard fetcher for any specific platform (LeetCode, Codeforces, CodeChef).
 * Returns raw rating as score.
 */
export async function getPlatformLeaderboard(
  platform: string,
  page = 1,
  limit = 50,
  filters?: { batch?: string; branch?: string }
) {
  const skip = (page - 1) * limit;
  const platformName = platform.toLowerCase();

  const batchFilter = filters?.batch
    ? Prisma.sql`AND u.batch = ${filters.batch}`
    : Prisma.empty;
  const branchFilter = filters?.branch
    ? Prisma.sql`AND u.branch = ${filters.branch}`
    : Prisma.empty;

  // Query similar to LeetCode but generic
  // We prioritize rating, then problemsSolved
  const rows = await prisma.$queryRaw`
    SELECT
      u.id as "userId",
      u.name,
      u."avatarUrl",
      ps.rating,
      ps."problemsSolved",
      ps."rankTitle",
      la.username as "handle"
    FROM "PlatformSnapshot" ps
    JOIN "LinkedAccount" la ON la.id = ps."linkedAccountId"
    JOIN "User" u ON u.id = la."userId"
    JOIN (
      SELECT "linkedAccountId", MAX("createdAt") AS maxc
      FROM "PlatformSnapshot"
      GROUP BY "linkedAccountId"
    ) latest
      ON ps."linkedAccountId" = latest."linkedAccountId"
      AND ps."createdAt" = latest.maxc
    WHERE la.platform = ${platformName}
      ${batchFilter}
      ${branchFilter}
    ORDER BY ps.rating DESC NULLS LAST, ps."problemsSolved" DESC NULLS LAST
    OFFSET ${skip}
    LIMIT ${limit}
  `;

  // Map to common structure
  const mapped = (rows as any[]).map((row, index) => ({
    id: row.userId,
    rank: skip + index + 1,
    score: row.rating || 0,
    scoreType: platformName,
    user: {
      id: row.userId,
      name: row.name || row.handle || "Unknown",
      avatarUrl: row.avatarUrl,
      handle: row.handle
    },
    meta: {
      rankTitle: row.rankTitle,
      problemsSolved: row.problemsSolved
    }
  }));

  return mapped;
}

export async function getDailyActivityLeaderboard(
  page = 1,
  limit = 50,
  filters?: { batch?: string; branch?: string; platform?: string }
) {
  const skip = (page - 1) * limit;
  const platform = filters?.platform?.toLowerCase() || "leetcode";

  // Fetch accounts ordered by streak
  const rows = await prisma.linkedAccount.findMany({
    where: {
      platform: platform === "all" ? undefined : platform,
      totalActiveDays: { gt: 0 },
      user: {
        batch: filters?.batch,
        branch: filters?.branch,
      },
    },
    orderBy: [
      { currentStreak: "desc" },
      { totalActiveDays: "desc" }
    ],
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  });

  return rows.map((row, index) => ({
    rank: skip + index + 1,
    user: row.user,
    currentStreak: row.currentStreak,
    totalActiveDays: row.totalActiveDays,
    lastActivityDate: row.lastActivityDate
  }));
}
