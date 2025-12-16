import { Router } from "express";
import prisma from "../config/db.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Manual snapshot trigger
 * POST /snapshots/codeforces/:accountId
 */
router.post("/codeforces/:accountId", authenticate, async (req, res) => {
  const accountId = Number(req.params.accountId);

  const account = await prisma.linkedAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  if (account.platform !== "codeforces") {
    return res.status(400).json({ message: "Unsupported platform" });
  }

  const data = await fetchCodeforcesUser(account.username);

  const snapshot = await prisma.platformSnapshot.create({
    data: {
      linkedAccountId: account.id,
      rating: data.rating ?? null,
      rankTitle: data.rank ?? null,
      problemsSolved: data.maxRating ?? null,
      rawData: data,
    },
  });

  res.json({ message: "Snapshot created", snapshot });
});

export default router;
