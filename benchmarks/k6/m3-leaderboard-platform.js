// M3: GET /leaderboard?platform=codeforces. PAGE=1 (default) or PAGE=deep (page min(200,last page)).
import { makeOptions, get, pageParam, summary, meta } from "./lib/common.js";
const PAGE = __ENV.PAGE || "1";
const PLATFORM = __ENV.PLATFORM || "codeforces";
const page = PAGE === "deep" ? meta.deepPage[PLATFORM] : Number(PAGE);
export const options = makeOptions(20);
export default function () { get(`/leaderboard?platform=${PLATFORM}&page=${pageParam(page)}&limit=50`); }
export const handleSummary = summary("m3-platform", { cacheRelevant: true, tag: `${PLATFORM}-p${PAGE}`, config: { platform: PLATFORM, page } });
