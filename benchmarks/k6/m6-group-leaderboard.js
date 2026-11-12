// M6: GET /groups/:id/leaderboard for the 50- (GROUP=g50) or 500-member (GROUP=g500) group. Auth: Bearer.
import { makeOptions, get, summary, meta, authHeaders } from "./lib/common.js";
const key = __ENV.GROUP || "g50";
const g = meta.groups[key];
if (!g) throw new Error(`no ${key} group in fixtures`);
const metric = __ENV.METRIC || "score";
// Rates are set below measured capacity (one request: ~0.4 s for 50 members, ~5 s for 500 members on the 1k dataset;
// 10 rps on the 500-member group exhausted the API's 4 GB heap and crashed it). Override with RATE / RATE_UNIT.
export const options = makeOptions(key === "g500" ? 1 : 2, { preVUs: 20, maxVUs: 200, timeUnit: key === "g500" ? "5s" : "1s" });
export default function () { get(`/groups/${g.groupId}/leaderboard?metric=${metric}`, authHeaders(g.token)); }
export const handleSummary = summary("m6-group", { tag: `${key}`, config: { groupId: g.groupId, members: g.members, metric } });
