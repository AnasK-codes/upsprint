import { fetchLeetCodeProfile } from "../services/leetcode.service.js";
import type { PlatformAdapter } from "./types.js";

type Profile = Awaited<ReturnType<typeof fetchLeetCodeProfile>>;

export const leetcodeAdapter: PlatformAdapter<Profile> = {
  name: "leetcode",
  fetchProfile: (username) => fetchLeetCodeProfile(username),
  toStats: (data) => {
    let calendar: unknown = data.submissionCalendar;
    if (typeof calendar === "string") {
      try {
        calendar = JSON.parse(calendar);
      } catch {
        calendar = {};
      }
    }
    return {
      rating: data.rating ?? null,
      rankTitle: null,
      problemsSolved: data.totalSolved ?? null,
      rawData: data.raw,
      calendar: calendar ? (calendar as Record<string, number>) : undefined,
    };
  },
};
