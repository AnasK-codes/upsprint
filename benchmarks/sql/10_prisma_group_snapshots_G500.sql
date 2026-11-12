-- GET /groups/:id/leaderboard (M6), the PlatformSnapshot include: Prisma's `snapshots: { orderBy: createdAt desc, take: 1 }`
-- is emitted WITHOUT a LIMIT (captured: "... ORDER BY createdAt DESC OFFSET $n"), so every snapshot, rawData included, of every
-- member account is loaded and only the first is used in JS. Account list inlined as a subquery of the same set.
SELECT "PlatformSnapshot"."id", "PlatformSnapshot"."linkedAccountId", "PlatformSnapshot"."rating", "PlatformSnapshot"."problemsSolved",
  "PlatformSnapshot"."rawData", "PlatformSnapshot"."createdAt", "PlatformSnapshot"."rankTitle"
FROM "PlatformSnapshot"
WHERE "PlatformSnapshot"."linkedAccountId" IN (
  SELECT la.id FROM "LinkedAccount" la WHERE la."userId" IN (SELECT "userId" FROM "GroupMember" WHERE "groupId" = {{G500}}))
ORDER BY "PlatformSnapshot"."createdAt" DESC;
