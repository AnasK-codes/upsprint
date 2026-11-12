import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Guards /metrics with a shared token: `Authorization: Bearer <METRICS_TOKEN>`.
 * Fails closed: if METRICS_TOKEN is not configured the endpoint is disabled.
 */
export const requireMetricsToken = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.METRICS_TOKEN;
  if (!expected) {
    return res.status(404).json({ message: "Not found" });
  }

  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
