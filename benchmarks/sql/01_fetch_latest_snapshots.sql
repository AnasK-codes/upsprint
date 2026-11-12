-- fetchLatestSnapshotsWithAccountUser() (leaderboard.service.ts) - used by rebuildLeaderboard(). Exact SQL.
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
