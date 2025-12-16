import prisma from "../config/db.js";
import { scoreLatestSnapshotForAccount } from "../services/leaderboard.service.js";

/**
 * Rebuild leaderboard from latest snapshots
 */
export async function rebuildLeaderboard() {
  const users = await prisma.user.findMany({
    include: { accounts: true },
  });

  const leaderboardRows: { userId: number; score: number }[] = [];

  for (const user of users) {
    let totalScore = 0;

    for (const acc of user.accounts) {
      totalScore += await scoreLatestSnapshotForAccount(acc.id);
    }

    leaderboardRows.push({
      userId: user.id,
      score: totalScore,
    });
  }

  leaderboardRows.sort((a, b) => b.score - a.score);

  for (let i = 0; i < leaderboardRows.length; i++) {
    const row = leaderboardRows[i];

    await prisma.leaderboard.upsert({
      where: { userId: row.userId },
      update: {
        score: row.score,
        rank: i + 1,
      },
      create: {
        userId: row.userId,
        score: row.score,
        rank: i + 1,
      },
    });
  }

  return {
    totalUsers: leaderboardRows.length,
  };
}
