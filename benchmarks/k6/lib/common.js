// Shared helpers for the k6 benchmark scripts.
//
// Env (all optional):
//   BASE_URL     http://localhost:4000
//   FIXTURES     path to fixtures.json relative to this file (default ../fixtures.json)
//   MODE         warm (default: WARMUP_S warm-up scenario, then measured scenario) | cold (no warm-up;
//                run it right after an API restart)
//   WARMUP_S     30      DURATION_S 60      RATE  per-script default      MAX_VUS 500
//   CACHE        hit (default; repeats identical URLs, so the API's in-memory cache serves most requests)
//                | miss (adds harmless whitespace/zero padding to `page` so every request gets a unique
//                cache key but identical SQL; measures the DB path)
//   OUT_DIR      directory for the summary JSON (default ./out relative to cwd)
import http from "k6/http";
import exec from "k6/execution";
import { check } from "k6";
import { Rate, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

export const BASE = __ENV.BASE_URL || "http://localhost:4000";
export const MODE = __ENV.MODE || "warm";
export const CACHE = __ENV.CACHE || "hit";
export const WARMUP_S = MODE === "cold" ? 0 : Number(__ENV.WARMUP_S || 30);
export const DURATION_S = Number(__ENV.DURATION_S || 60);

const FIX = __ENV.FIXTURES || "../fixtures.json";
export const rankUsers = new SharedArray("rankUsers", () => JSON.parse(open(FIX)).rankUsers);
export const candidates = new SharedArray("candidates", () => JSON.parse(open(FIX)).connect.candidates);
const metaArr = new SharedArray("meta", () => {
  const f = JSON.parse(open(FIX));
  return [{ filters: f.filters, lastPage: f.lastPage, deepPage: f.deepPage, groups: f.groups }];
});
export const meta = metaArr[0];

export const benchErrors = new Rate("bench_errors"); // unexpected status
export const connectOk = new Counter("connect_ok");
export const connectFail = new Counter("connect_fail");

/** constant-arrival-rate options: optional warm-up scenario + measured scenario. */
let configuredRate, configuredUnit;
export function makeOptions(defaultRate, { preVUs = 50, maxVUs = Number(__ENV.MAX_VUS || 500), timeUnit = "1s" } = {}) {
  const rate = Number(__ENV.RATE || defaultRate);
  configuredRate = rate;
  configuredUnit = timeUnit;
  const base = { executor: "constant-arrival-rate", rate, timeUnit: __ENV.RATE_UNIT || timeUnit, preAllocatedVUs: preVUs, maxVUs };
  const scenarios = {};
  if (WARMUP_S > 0) scenarios.warmup = { ...base, duration: `${WARMUP_S}s`, tags: { phase: "warmup" } };
  scenarios.measure = { ...base, duration: `${DURATION_S}s`, startTime: `${WARMUP_S}s`, tags: { phase: "measure" } };
  return {
    scenarios,
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
    // empty threshold lists only exist to make k6 compute the per-scenario sub-metrics we report
    thresholds: {
      "http_req_duration{scenario:measure}": [],
      "http_req_failed{scenario:measure}": [],
      "http_reqs{scenario:measure}": [],
      "bench_errors{scenario:measure}": [],
      "dropped_iterations{scenario:measure}": [],
    },
  };
}

/** Unique-cache-key but semantically identical page param (Number(" 00 7") ... -> 7). */
export function pageParam(page) {
  if (CACHE !== "miss") return String(page);
  const i = exec.scenario.iterationInTest;
  const zeros = "0".repeat(i % 150);
  const spaces = "%20".repeat(Math.floor(i / 150) % 100);
  return `${spaces}${zeros}${page}`;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function get(path, params = {}, expected = 200) {
  const res = http.get(`${BASE}${path}`, params);
  const ok = res.status === expected;
  benchErrors.add(!ok);
  check(res, { [`status ${expected}`]: () => ok });
  return res;
}

export function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

/** Builds handleSummary writing <OUT_DIR>/<name>.<mode>[.<cache>].json and a short stdout line. */
export function summary(name, extra = {}) {
  return function (data) {
    const m = (k) => data.metrics[k] && (data.metrics[k].values || data.metrics[k]);
    const dur = m("http_req_duration{scenario:measure}") || {};
    const reqs = m("http_reqs{scenario:measure}") || {};
    const failed = m("http_req_failed{scenario:measure}") || {};
    const be = m("bench_errors{scenario:measure}") || {};
    const dropped = m("dropped_iterations{scenario:measure}") || {};
    const out = {
      name,
      mode: MODE,
      cache: extra.cacheRelevant ? CACHE : undefined,
      config: { rate: configuredRate, timeUnit: __ENV.RATE_UNIT || configuredUnit, warmupS: WARMUP_S, durationS: DURATION_S, ...extra.config },
      latencyMs: { p50: dur.med, p95: dur["p(95)"], p99: dur["p(99)"], avg: dur.avg, min: dur.min, max: dur.max },
      requests: reqs.count,
      reqPerSec: reqs.count != null && !extra.burst ? reqs.count / DURATION_S : undefined,
      httpFailedRate: failed.rate ?? failed.value,
      unexpectedStatusRate: be.rate ?? be.value,
      droppedIterations: dropped.count ?? 0,
      connectOk: m("connect_ok")?.count,
      connectFail: m("connect_fail")?.count,
    };
    const suffix = [MODE, extra.cacheRelevant ? CACHE : null, extra.tag || null].filter(Boolean).join(".");
    const dir = __ENV.OUT_DIR || "./out";
    const line = `${name} [${suffix}] p50=${fmt(out.latencyMs.p50)} p95=${fmt(out.latencyMs.p95)} p99=${fmt(out.latencyMs.p99)} ` +
      `rps=${fmt(out.reqPerSec)} err=${fmt((out.unexpectedStatusRate ?? 0) * 100)}% dropped=${out.droppedIterations}\n`;
    return { stdout: line, [`${dir}/${name}.${suffix}.json`]: JSON.stringify(out, null, 2) };
  };
}
const fmt = (n) => (n == null ? "n/a" : Number(n).toFixed(2));
