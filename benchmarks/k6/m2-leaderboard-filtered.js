// M2: GET /leaderboard?batch=..&branch=.. (filtered path); rotates over the most common seeded combos.
import { makeOptions, get, pageParam, summary, meta, pick } from "./lib/common.js";
export const options = makeOptions(50);
export default function () {
  const f = pick(meta.filters);
  get(`/leaderboard?batch=${f.batch}&branch=${f.branch}&page=${pageParam(1)}&limit=50`);
}
export const handleSummary = summary("m2-filtered", { cacheRelevant: true });
