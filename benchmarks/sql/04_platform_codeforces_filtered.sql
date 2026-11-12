-- getPlatformLeaderboard('codeforces', page, 50, batch, branch) (leaderboard.service.ts). Exact SQL, parameters inlined. With batch+branch filters.
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
WHERE la.platform = 'codeforces'
  AND u."leaderboardVisibility" = 'GLOBAL_AND_GROUPS'
  AND u.batch = '{{BATCH}}'
  AND u.branch = '{{BRANCH}}'
ORDER BY ps.rating DESC NULLS LAST, ps."problemsSolved" DESC NULLS LAST
OFFSET 0
LIMIT 50;
