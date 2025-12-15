import { Router } from "express";
import prisma from "../config/db.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/link", authenticate, async (req: any, res) => {
  const { platform, username } = req.body;

  if (!platform || !username) {
    return res.status(400).json({ message: "Platform and username required" });
  }

  const account = await prisma.linkedAccount.create({
    data: {
      platform,
      username,
      userId: req.userId,
    },
  });

  res.json({ message: "Account linked", account });
});

export default router;
