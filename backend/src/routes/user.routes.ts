import { Router } from "express";
import prisma from "../config/db.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/* GET current user */
router.get("/me", authenticate, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      batch: true,
      branch: true,
      createdAt: true,
    },
  });

  res.json(user);
});

export default router;
