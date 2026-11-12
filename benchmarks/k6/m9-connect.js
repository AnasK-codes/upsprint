// M9: POST /users/accounts/connect (codechef) latency. Synchronous snapshot fetch from the mock platform
// plus a FULL leaderboard rebuild inside the request. Each iteration consumes one fixture user (mutating!).
// Start the mock with MOCK_LATENCY_MS=300 for the roadmap's definition. Warm-up uses candidates [0..),
// the measured phase [OFFSET..), so no user is connected twice.
import http from "k6/http";
import exec from "k6/execution";
import { check } from "k6";
import { makeOptions, BASE, summary, candidates, authHeaders, benchErrors, connectOk, connectFail } from "./lib/common.js";

const OFFSET = Number(__ENV.OFFSET || 100);
export const options = makeOptions(Number(__ENV.RATE || 1), { preVUs: 20, maxVUs: 200 });
export default function () {
  const base = exec.scenario.name === "warmup" ? 0 : OFFSET;
  const c = candidates[(base + exec.scenario.iterationInTest) % candidates.length];
  const res = http.post(`${BASE}/users/accounts/connect`, JSON.stringify({ platform: "codechef", username: c.username }), authHeaders(c.token));
  const ok = res.status === 201;
  benchErrors.add(!ok);
  (ok ? connectOk : connectFail).add(1);
  check(res, { "status 201": () => ok });
}
export const handleSummary = summary("m9-connect", { config: { offset: OFFSET } });
