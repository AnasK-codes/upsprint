// M5: GET /leaderboard/user/:id (no cache in the API; public route).
import { makeOptions, get, summary, rankUsers, pick } from "./lib/common.js";
export const options = makeOptions(50);
export default function () { get(`/leaderboard/user/${pick(rankUsers)}`); }
export const handleSummary = summary("m5-user-rank");
