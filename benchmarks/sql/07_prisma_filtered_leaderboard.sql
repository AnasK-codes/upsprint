-- GET /leaderboard?batch=..&branch=.. (M2): Prisma query with the filters inlined.
SELECT "Leaderboard"."id", "Leaderboard"."userId", "Leaderboard"."score", "Leaderboard"."rank", "Leaderboard"."updatedAt"
FROM "Leaderboard" LEFT JOIN "User" AS "j0" ON ("j0"."id") = ("Leaderboard"."userId")
WHERE ("j0"."batch" = '{{BATCH}}' AND "j0"."branch" = '{{BRANCH}}'
  AND "j0"."leaderboardVisibility" = CAST('GLOBAL_AND_GROUPS'::text AS "LeaderboardVisibility") AND ("j0"."id" IS NOT NULL))
ORDER BY "Leaderboard"."rank" ASC LIMIT 50 OFFSET 0;
