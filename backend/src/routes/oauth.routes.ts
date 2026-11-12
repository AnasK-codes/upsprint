import { Router } from "express";
import passport from "passport";
import crypto from "crypto";
import "../config/passport.js";
import { issueOAuthCode } from "../services/oauthCode.service.js";
import { validate } from "../middleware/validate.middleware.js";
import { oauthCallbackQuery } from "../validation/schemas.js";
import logger from "../utils/logger.js";

const router = Router();

/**
 * Step 1: Redirect to Google
 * Generate and store random state to prevent CSRF
 */
router.get("/google", (req, res, next) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
    maxAge: 5 * 60 * 1000
  }); // 5 min

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state,
  })(req, res, next);
});

/**
 * Step 2: Google callback
 */
router.get(
  "/google/callback",
  validate({ query: oauthCallbackQuery.loose() }),
  (req, res, next) => {
    // Validate state
    const storedState = req.cookies["oauth_state"];
    const queryState = req.query.state as string;

    if (!storedState || !queryState || storedState !== queryState) {
      logger.warn("OAuth state mismatch");
      return res.status(403).json({ message: "Invalid state parameter (CSRF)" });
    }

    res.clearCookie("oauth_state");
    next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      const user = req.user as { id: number };

      // Hand the frontend a short-lived one-time code, never the JWT. The
      // frontend exchanges it via POST /auth/exchange, which sets the cookie.
      const code = await issueOAuthCode(user.id);
      const url = new URL("/oauth-success", process.env.FRONTEND_URL);
      url.searchParams.set("code", code);
      res.redirect(url.toString());
    } catch (err) {
      logger.error("OAuth callback failed", { error: err });
      res.redirect(new URL("/login?error=oauth", process.env.FRONTEND_URL).toString());
    }
  }
);

export default router;
