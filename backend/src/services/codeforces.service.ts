import axios from "axios";
import { platformRequestConfig } from "../utils/http.js";

export const fetchCodeforcesUser = async (handle: string) => {
  const res = await axios.get(
    `${process.env.CODEFORCES_BASE_URL ?? "https://codeforces.com"}/api/user.info?handles=${encodeURIComponent(handle)}`,
    platformRequestConfig
  );

  return res.data.result[0];
};
