import { z } from "zod";
import { VALID_BRANCHES, VALID_PLATFORMS } from "../utils/constants.js";

// ---- shared pieces -------------------------------------------------------

const batchYear = z.string().regex(/^\d{4}$/, "Invalid batch year");
const branch = z.string().refine((b) => VALID_BRANCHES.includes(b), "Invalid branch");
const positiveInt = z.coerce.number().int().positive();

// ---- auth ----------------------------------------------------------------

export const registerBody = z.object({
  email: z
    .string({ error: "Email and Password required" })
    .trim()
    .min(1, "Email and Password required")
    .max(254)
    .pipe(z.email("Invalid email address")),
  password: z
    .string({ error: "Email and Password required" })
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be at most 72 characters"),
  name: z.string().trim().min(1).max(100).nullish(),
  batch: z.preprocess((v) => (typeof v === "number" ? String(v) : v), batchYear.nullish()),
  branch: branch.nullish(),
});

export const loginBody = z.object({
  email: z.string({ error: "Email and password required" }).min(1, "Email and password required").max(254),
  password: z.string({ error: "Email and password required" }).min(1, "Email and password required").max(128),
});

export const exchangeBody = z.object({
  code: z.string({ error: "Code is required" }).min(1, "Code is required").max(200),
});

export const oauthCallbackQuery = z.object({
  state: z.string({ error: "Invalid state parameter" }).min(1).max(200),
});

// ---- users ---------------------------------------------------------------

export const updateProfileBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  batch: batchYear.nullish(),
  branch: branch.nullish(),
  avatarUrl: z.url().max(2048).nullish(),
});

export const visibilityBody = z.object({
  visibility: z.enum(["GLOBAL_AND_GROUPS", "GROUPS_ONLY"], { error: "Invalid visibility option" }),
});

export const connectAccountBody = z.object({
  platform: z
    .string({ error: "Platform and username are required" })
    .min(1, "Platform and username are required")
    .refine((p) => VALID_PLATFORMS.includes(p.toLowerCase()), "Invalid platform"),
  username: z
    .string({ error: "Platform and username are required" })
    .trim()
    .min(1, "Platform and username are required")
    .max(100),
});

export const idParams = z.object({ id: positiveInt });
export const accountIdParams = z.object({ accountId: positiveInt });
export const groupIdParams = z.object({ groupId: positiveInt });
export const userIdParams = z.object({ userId: positiveInt });
export const topNParams = z.object({ n: z.coerce.number().int().min(1).transform((n) => Math.min(100, n)) });

// ---- groups --------------------------------------------------------------

export const createGroupBody = z.object({
  name: z
    .string({ error: "Group name is required" })
    .min(1, "Group name is required")
    .min(3, "Name must be between 3 and 50 characters")
    .max(50, "Name must be between 3 and 50 characters"),
  description: z.string().max(200, "Description too long (max 200 chars)").nullish(),
});

export const joinGroupBody = z.object({
  code: z.string({ error: "Invite code is required" }).trim().min(1, "Invite code is required").max(50),
});

export const GROUP_METRICS = [
  "score",
  "activity_7d",
  "activity_today",
  "leetcode_streak",
  "total_solved",
  "contest_rating",
] as const;

// ---- pagination / filters (query) ----------------------------------------

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).transform((n) => Math.min(100, n)).default(50);

export const paginationQuery = z.object({ page, limit });

export const groupLeaderboardQuery = z.object({
  page,
  limit,
  metric: z.enum(GROUP_METRICS).default("score"),
});

export const leaderboardFiltersQuery = z.object({
  page,
  limit,
  batch: z
    .string()
    .refine((b) => b === "All" || /^\d{4}$/.test(b), "Invalid batch year")
    .optional(),
  branch: z
    .string()
    .refine((b) => b === "All" || VALID_BRANCHES.includes(b), "Invalid branch")
    .optional(),
  platform: z
    .string()
    .refine((p) => p.toLowerCase() === "all" || VALID_PLATFORMS.includes(p.toLowerCase()), "Invalid platform")
    .optional(),
});

