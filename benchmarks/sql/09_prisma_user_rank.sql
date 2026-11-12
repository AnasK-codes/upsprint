-- GET /leaderboard/user/:id (M5): main lookup (followed by User/LinkedAccount lookups by id, and a
-- LinkedAccount ORDER BY currentStreak DESC lookup for that user).
SELECT "Leaderboard"."id", "Leaderboard"."userId", "Leaderboard"."score", "Leaderboard"."rank", "Leaderboard"."updatedAt"
FROM "Leaderboard" LEFT JOIN "User" AS "j0" ON ("j0"."id") = ("Leaderboard"."userId")
WHERE ("Leaderboard"."userId" = {{USER_ID}} AND ("j0"."leaderboardVisibility" = CAST('GLOBAL_AND_GROUPS'::text AS "LeaderboardVisibility" ) AND ("j0"."id" IS NOT NULL)))
LIMIT 1 OFFSET 0;
