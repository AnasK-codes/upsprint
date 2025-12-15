import { Router } from "express";
import prisma from "../config/db.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";

const router = Router();

router.post("/codeforces/:accountId", authenticate, async (req, res) => {
  const accountId = Number(req.params.accountId);

  const account = await prisma.linkedAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const data = await fetchCodeforcesUser(account.username);

  const snapshot = await prisma.platformSnapshot.create({
    data: {
      linkedAccountId: account.id,
      rating: data.rating,
      rankTitle: data.rank,
      problemsSolved: data.maxRating,
      rawData: data,
    },
  });

  res.json(snapshot);
});

export default router;
