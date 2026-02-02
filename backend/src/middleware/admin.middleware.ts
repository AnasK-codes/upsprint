
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import prisma from "../config/db.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });

    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      console.warn(`Unauthorized admin access attempt by User ID ${req.userId} (${user?.email})`);
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
