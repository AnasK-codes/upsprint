import { fetchCodeforcesUser } from "../services/codeforces.service.js";
import type { PlatformAdapter } from "./types.js";

type Profile = Awaited<ReturnType<typeof fetchCodeforcesUser>>;

export const codeforcesAdapter: PlatformAdapter<Profile> = {
  name: "codeforces",
  fetchProfile: (username) => fetchCodeforcesUser(username),
  toStats: (data) => ({
    rating: data.rating ?? null,
    rankTitle: data.rank ?? null,
    // Codeforces exposes no solved count here; maxRating is kept in rawData.
    // A real solved count arrives in Phase 3.
    problemsSolved: null,
    rawData: { ...data, maxRating: data.maxRating ?? null },
  }),
};
