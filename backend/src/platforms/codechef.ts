import { fetchCodeChefProfile } from "../services/codechef.service.js";
import type { PlatformAdapter } from "./types.js";

type Profile = Awaited<ReturnType<typeof fetchCodeChefProfile>>;

export const codechefAdapter: PlatformAdapter<Profile> = {
  name: "codechef",
  fetchProfile: (username) => fetchCodeChefProfile(username),
  toStats: (data) => ({
    rating: data.rating,
    rankTitle: data.stars || null,
    problemsSolved: null,
    rawData: data.raw,
  }),
};
