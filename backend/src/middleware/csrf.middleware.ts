import { Request, Response, NextFunction } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const normalize = (origin: string) => origin.trim().replace(/\/+$/, "").toLowerCase();

const allowedOrigins = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(normalize);

/**
 * CSRF protection for cookie auth: Origin check on state-changing requests.
 *
 * Browsers always send an Origin header on cross-origin POST/PUT/PATCH/DELETE
 * and JS cannot forge it. A request carrying one must come from FRONTEND_URL.
 * If Origin is absent we fall back to Referer; if both are absent the request
 * is rejected when it carries the auth cookie (a browser would have sent them).
 * Non-browser clients without the cookie (curl, health checks) are unaffected.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  let source: string | undefined;
  if (origin) {
    source = origin;
  } else if (referer) {
    try {
      source = new URL(referer).origin;
    } catch {
      source = "invalid";
    }
  }

  if (source) {
    if (allowedOrigins().includes(normalize(source))) return next();
    return res.status(403).json({ message: "Forbidden: cross-origin request blocked" });
  }

  if (req.cookies?.token) {
    return res.status(403).json({ message: "Forbidden: missing Origin header" });
  }
  next();
};
