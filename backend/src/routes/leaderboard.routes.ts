import { Router } from "express";
import prisma from "../config/db.js";
import { calculateScore } from "../services/leaderboard.service.js";

const router = Router();

router.get("/", async (_, res) => {
  const users = await prisma.user.findMany({
    include: {
      accounts: {
        include: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const leaderboard = users.map((user: any) => {
    let totalScore = 0;

    user.accounts.forEach((acc: any) => {
      if (acc.snapshots[0]) {
        totalScore += calculateScore(acc.snapshots[0]);
      }
    });

    return {
      userId: user.id,
      name: user.name,
      score: totalScore,
    };
  });

  leaderboard.sort((a: any, b: any) => b.score - a.score);

  res.json(leaderboard);
});

export default router;
