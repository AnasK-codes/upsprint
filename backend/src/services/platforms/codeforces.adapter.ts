import axios from "axios";
import { PlatformAdapter } from "./index.js";

export const CodeforcesAdapter: PlatformAdapter = {
  name: "codeforces",
  async fetchSnapshot(username) {
    const res = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`);
    const u = res.data.result[0];
    return {
      rating: u.rating ?? null,
      rankTitle: u.rank ?? null,
      problemsSolved: u.maxRating ?? null,
      raw: u,
    };
  }
};
