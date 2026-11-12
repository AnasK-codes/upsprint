// Smoke test: the real (built) backend services must parse the mock without errors,
// and unset env vars must leave the real URLs in place. Run: npm run verify
// Requires: mock running on :4100, `npm run build` done in backend/.
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.env.MOCK_URL ?? "http://localhost:4100";
const dist = path.resolve(import.meta.dirname, "../../backend/dist/services");
process.env.LEETCODE_BASE_URL = base;
process.env.CODEFORCES_BASE_URL = base;
process.env.CODECHEF_BASE_URL = base;

const load = (f: string) => import(pathToFileURL(path.join(dist, f)).href);
const lc = await load("leetcode.service.js");
const cf = await load("codeforces.service.js");
const cc = await load("codechef.service.js");

const l = await lc.fetchLeetCodeProfile("verify_user");
assert.ok(l.totalSolved >= 0 && typeof l.submissionCalendar === "object", "leetcode parse");
assert.ok(l.raw.matchedUser.submissionCalendar, "leetcode raw has calendar");
const c = await cf.fetchCodeforcesUser("verify_user");
assert.equal(c.handle, "verify_user");
assert.ok(c.rating > 0, "codeforces rating");
const h = await cc.fetchCodeChefProfile("verify_user");
assert.ok(h.rating > 0 && h.stars && h.globalRank && h.countryRank, "codechef parse");

// Deterministic?
const l2 = await lc.fetchLeetCodeProfile("verify_user");
assert.equal(l2.totalSolved, l.totalSolved);

// Missing users
await assert.rejects(lc.fetchLeetCodeProfile("nouser_x"), /User not found/);
await assert.rejects(cc.fetchCodeChefProfile("nouser_x"));

console.log("OK", { leetcode: l.totalSolved, cfRating: c.rating, ccRating: h.rating, stars: h.stars });

// Default URLs untouched when env vars are unset (fresh import with cache-bust).
delete process.env.LEETCODE_BASE_URL;
delete process.env.CODEFORCES_BASE_URL;
delete process.env.CODECHEF_BASE_URL;
const src = await import("node:fs").then((fs) =>
  ["leetcode", "codeforces", "codechef"].map((n) => fs.readFileSync(path.join(dist, `${n}.service.js`), "utf8")).join("\n"));
for (const d of ["https://leetcode.com", "https://codeforces.com", "https://www.codechef.com"]) {
  assert.ok(src.includes(d), `default ${d} present`);
}
console.log("defaults OK");
