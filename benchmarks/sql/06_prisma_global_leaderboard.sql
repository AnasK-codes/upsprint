-- GET /leaderboard (global, page 1): main Prisma query, captured in captured/prisma-queries.log
-- (a second query then loads the 50 users by id: User.id IN (...), a primary-key lookup).
SELECT "Leaderboard"."id", "Leaderboard"."userId", "Leaderboard"."score", "Leaderboard"."rank", "Leaderboard"."updatedAt"
FROM "Leaderboard" LEFT JOIN "User" AS "j0" ON ("j0"."id") = ("Leaderboard"."userId")
WHERE ("j0"."leaderboardVisibility" = CAST('GLOBAL_AND_GROUPS'::text AS "LeaderboardVisibility") AND ("j0"."id" IS NOT NULL))
ORDER BY "Leaderboard"."rank" ASC LIMIT 50 OFFSET 0;
