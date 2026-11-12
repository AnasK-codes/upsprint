import type { Prisma } from "@prisma/client";

export const PLATFORM_NAMES = ["leetcode", "codeforces", "codechef"] as const;
export type PlatformName = (typeof PLATFORM_NAMES)[number];

/** Platform-independent snapshot fields, ready to store in PlatformSnapshot. */
export interface SnapshotStats {
  rating: number | null;
  rankTitle: string | null;
  problemsSolved: number | null;
  rawData: Prisma.InputJsonValue;
  /**
   * Submission heatmap (unix-seconds -> count). Only platforms that expose one
   * (LeetCode) set it; it switches on streak calculation and delta activity sync.
   */
  calendar?: Record<string, number>;
}

/** Adding a platform = implement this and register it in platforms/index.ts. */
export interface PlatformAdapter<Profile = unknown> {
  name: PlatformName;
  /** Fetch the public profile. Throws on any failure (callers rely on that). */
  fetchProfile(username: string): Promise<Profile>;
  /** Pure mapping from the platform profile to stored snapshot fields. */
  toStats(profile: Profile): SnapshotStats;
}
