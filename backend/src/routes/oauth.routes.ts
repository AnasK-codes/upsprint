import { Router } from "express";
import passport from "passport";
import "../config/passport.js";
import { generateToken } from "../controllers/auth.controller.js";

const router = Router();

/**
 * Step 1: Redirect to Google
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * Step 2: Google callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken(user.id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Better for redirect flows and dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // redirect back to frontend home
    res.redirect(`${process.env.FRONTEND_URL}/`);
  }
);

export default router;
