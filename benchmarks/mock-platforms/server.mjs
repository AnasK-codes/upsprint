// Mock LeetCode / Codeforces / CodeChef for benchmarks. node:http only.
// Env: MOCK_PORT (4100), MOCK_LATENCY_MS (0), MOCK_JITTER_MS (0), MOCK_ERROR_RATE (0..1), MOCK_SEED (1)
import http from "node:http";
import { URL } from "node:url";
import {
  DAY, dayStart, mulberry32, profileFor, calendarString,
  leetcodeData, codeforcesUser, codechefHtml,
} from "../lib/gen.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 4100);
const LATENCY = Number(process.env.MOCK_LATENCY_MS ?? 0);
const JITTER = Number(process.env.MOCK_JITTER_MS ?? 0);
const ERROR_RATE = Number(process.env.MOCK_ERROR_RATE ?? 0);
const rng = mulberry32(Number(process.env.MOCK_SEED ?? 1));

const stats = { total: 0, errors: 0, leetcode: 0, codeforces: 0, codechef: 0 };
const today = () => dayStart(Math.floor(Date.now() / 1000));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://mock");
  if (url.pathname === "/__health") return json(res, 200, { ok: true });
  if (url.pathname === "/__stats") return json(res, 200, stats);

  stats.total++;
  const delay = LATENCY + (JITTER ? Math.round((rng() * 2 - 1) * JITTER) : 0);
  if (delay > 0) await sleep(delay);
  if (ERROR_RATE > 0 && rng() < ERROR_RATE) {
    stats.errors++;
    return json(res, 500, { error: "mock injected failure" });
  }

  try {
    if (req.method === "POST" && url.pathname === "/graphql") {
      stats.leetcode++;
      const { variables } = JSON.parse((await readBody(req)) || "{}");
      const username = String(variables?.username ?? "");
      if (!username || username.startsWith("nouser_")) {
        return json(res, 200, { data: { matchedUser: null, userContestRanking: null } });
      }
      const end = today();
      const p = profileFor(username, end).leetcode;
      return json(res, 200, { data: leetcodeData(username, p, calendarString(p.activity, end)) });
    }

    if (req.method === "GET" && url.pathname === "/api/user.info") {
      stats.codeforces++;
      const handle = url.searchParams.get("handles") ?? "";
      if (!handle || handle.startsWith("nouser_")) {
        return json(res, 400, { status: "FAILED", comment: `handles: User with handle ${handle} not found` });
      }
      const p = profileFor(handle, today()).codeforces;
      return json(res, 200, { status: "OK", result: [codeforcesUser(handle, p, Math.floor(Date.now() / 1000))] });
    }

    const m = url.pathname.match(/^\/users\/([^/]+)$/);
    if (req.method === "GET" && m) {
      stats.codechef++;
      const username = decodeURIComponent(m[1]);
      if (username.startsWith("nouser_")) {
        res.writeHead(404, { "Content-Type": "text/html" });
        return res.end("<html><body>Not found</body></html>");
      }
      const html = codechefHtml(username, profileFor(username, today()).codechef);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html) });
      return res.end(html);
    }

    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => {
  console.log(`[mock-platforms] :${PORT} latency=${LATENCY}ms jitter=${JITTER}ms errorRate=${ERROR_RATE}`);
});
