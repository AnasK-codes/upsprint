export const VALID_BRANCHES = ["CSE", "IT", "ECE", "ME", "EE", "CE", "CHE"];
export const VALID_PLATFORMS = ["leetcode", "codeforces", "codechef"];

const isProd = process.env.NODE_ENV === "production";

/**
 * Auth cookie options. The cookie is httpOnly, so frontend JS never sees the JWT.
 *
 * - Same-site deployment (e.g. app.example.com + api.example.com): set
 *   COOKIE_SAMESITE=lax and COOKIE_DOMAIN=.example.com.
 * - Cross-site deployment (different registrable domains): the default in
 *   production, SameSite=None; Secure. Browsers that block third-party cookies
 *   will not keep it, so prefer same-site (see README, "Deployment and cookies").
 */
const sameSiteEnv = (process.env.COOKIE_SAMESITE || "").toLowerCase();
const sameSite: "none" | "lax" | "strict" =
  sameSiteEnv === "lax" || sameSiteEnv === "strict" || sameSiteEnv === "none"
    ? sameSiteEnv
    : isProd
      ? "none"
      : "lax";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd || sameSite === "none",
  sameSite,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
