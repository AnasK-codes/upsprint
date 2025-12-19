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
 * Normalize rating (0..1) and compute a scaled score (0..1000*weight).
 * Keep this simple and deterministic.
 */
export function normalizeRating(platform: string, rawData: any): number {
  const rating = rawData?.rating ?? rawData?.maxRating ?? 0;
  const max = platform === "codeforces" ? 4000 : 3000;
  if (!rating) return 0;
  return Math.min(1, rating / max);
}

export function computeScore(platform: string, rawData: any, weight = 1) {
  const normalized = normalizeRating(platform, rawData ?? {});
  return normalized * weight * 1000;
}
