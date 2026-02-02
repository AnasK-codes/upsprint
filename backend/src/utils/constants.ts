export const VALID_BRANCHES = ["CSE", "IT", "ECE", "ME", "EE", "CE", "CHE"];
export const VALID_PLATFORMS = ["leetcode", "codeforces", "codechef"];

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
