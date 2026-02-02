import { Router } from "express";
import passport from "passport";
import crypto from "crypto";
import "../config/passport.js";
import { generateToken } from "../controllers/auth.controller.js";
import { COOKIE_OPTIONS } from "../utils/constants.js";

const router = Router();

/**
 * Step 1: Redirect to Google
 * Generate and store random state to prevent CSRF
 */
router.get("/google", (req, res, next) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { httpOnly: true, maxAge: 5 * 60 * 1000 }); // 5 min

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
  (req, res, next) => {
    // Validate state
    const storedState = req.cookies["oauth_state"];
    const queryState = req.query.state as string;

    if (!storedState || !queryState || storedState !== queryState) {
      console.error("OAuth state mismatch!", { storedState, queryState });
      return res.status(403).json({ message: "Invalid state parameter (CSRF)" });
    }

    res.clearCookie("oauth_state");
    next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken(user.id);

    // Set cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // redirect back to frontend home with token
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  }
);

export default router;
