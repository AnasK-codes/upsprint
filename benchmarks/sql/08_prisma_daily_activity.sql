-- GET /leaderboard/daily-activity (M4): Prisma query (then User.id IN (...) lookup for the 50 rows).
SELECT "LinkedAccount"."id", "LinkedAccount"."userId", "LinkedAccount"."platform", "LinkedAccount"."username", "LinkedAccount"."createdAt",
  "LinkedAccount"."currentStreak", "LinkedAccount"."lastActivityDate", "LinkedAccount"."totalActiveDays"
FROM "LinkedAccount" LEFT JOIN "User" AS "j0" ON ("j0"."id") = ("LinkedAccount"."userId")
WHERE ("LinkedAccount"."platform" = 'leetcode' AND "LinkedAccount"."totalActiveDays" > 0
  AND ("j0"."leaderboardVisibility" = CAST('GLOBAL_AND_GROUPS'::text AS "LeaderboardVisibility") AND ("j0"."id" IS NOT NULL)))
ORDER BY "LinkedAccount"."currentStreak" DESC, "LinkedAccount"."totalActiveDays" DESC LIMIT 50 OFFSET 0;
