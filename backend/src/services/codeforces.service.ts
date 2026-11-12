import axios from "axios";
import { platformRequestConfig } from "../utils/http.js";

export const fetchCodeforcesUser = async (handle: string) => {
  const res = await axios.get(
    `${process.env.CODEFORCES_BASE_URL ?? "https://codeforces.com"}/api/user.info?handles=${encodeURIComponent(handle)}`,
    platformRequestConfig
  );

  return res.data.result[0];
};

/**
 * Batch lookup: one user.info call for many handles (semicolon separated).
 * Codeforces fails the WHOLE call with a 400 if any handle does not exist, so
 * callers must be ready to fall back to single lookups.
 */
export const fetchCodeforcesUsers = async (handles: string[]) => {
  const list = handles.map(encodeURIComponent).join(";");
  const res = await axios.get(
    `${process.env.CODEFORCES_BASE_URL ?? "https://codeforces.com"}/api/user.info?handles=${list}`,
    platformRequestConfig
  );

  return res.data.result as Array<{ handle: string; [key: string]: any }>;
};
