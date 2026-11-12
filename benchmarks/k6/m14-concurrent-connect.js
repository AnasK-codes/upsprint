// M14: N (default 10) simultaneous connect calls, each from a different user, so N full leaderboard
// rebuilds race each other. One iteration per VU, no warm-up (a burst, not a rate). Mutating.
// Per-call status and latency are logged as JSON lines; check API logs for errors/deadlocks.
import http from "k6/http";
import exec from "k6/execution";
import { check } from "k6";
import { BASE, summary, candidates, authHeaders, benchErrors, connectOk, connectFail } from "./lib/common.js";

const N = Number(__ENV.CONCURRENCY || 10);
const OFFSET = Number(__ENV.OFFSET || 300);
export const options = {
  scenarios: { measure: { executor: "per-vu-iterations", vus: N, iterations: 1, maxDuration: "300s" } },
  summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  thresholds: {
    "http_req_duration{scenario:measure}": [], "http_req_failed{scenario:measure}": [],
    "http_reqs{scenario:measure}": [], "bench_errors{scenario:measure}": [], "dropped_iterations{scenario:measure}": [],
  },
};
export default function () {
  const c = candidates[(OFFSET + exec.vu.idInTest - 1) % candidates.length];
  const res = http.post(`${BASE}/users/accounts/connect`, JSON.stringify({ platform: "codechef", username: c.username }), authHeaders(c.token));
  const ok = res.status === 201;
  benchErrors.add(!ok);
  (ok ? connectOk : connectFail).add(1);
  check(res, { "status 201": () => ok });
  console.log(JSON.stringify({ m14: true, vu: exec.vu.idInTest, status: res.status, ms: Math.round(res.timings.duration), body: ok ? undefined : String(res.body).slice(0, 120) }));
}
const base = summary("m14-concurrent-connect", { burst: true, config: { concurrency: N, offset: OFFSET } });
// a burst has no meaningful req/s over DURATION_S; report requests and the latency distribution only
export function handleSummary(data) { return base(data); }
