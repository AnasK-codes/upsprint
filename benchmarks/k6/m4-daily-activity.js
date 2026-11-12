// M4: GET /leaderboard/daily-activity (streak board).
import { makeOptions, get, pageParam, summary } from "./lib/common.js";
export const options = makeOptions(50);
export default function () { get(`/leaderboard/daily-activity?page=${pageParam(1)}&limit=50`); }
export const handleSummary = summary("m4-daily-activity", { cacheRelevant: true });
