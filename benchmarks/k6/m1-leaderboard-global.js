// M1: GET /leaderboard (global, page 1). Run with CACHE=hit and CACHE=miss, MODE=cold and MODE=warm.
import { makeOptions, get, pageParam, summary } from "./lib/common.js";
export const options = makeOptions(50);
export default function () { get(`/leaderboard?page=${pageParam(1)}&limit=50`); }
export const handleSummary = summary("m1-global", { cacheRelevant: true });
