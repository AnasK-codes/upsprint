// First-load JS per route from a production build: every <script src> in the prerendered HTML, sized from .next/static.
// (Next 16's `next build` no longer prints a "First Load JS" column.) Usage: node scripts/first-load-js.mjs <frontendDir> <out.json>
// Counts scripts the HTML references up front; chunks loaded later via dynamic import are not included.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [fe, out] = process.argv.slice(2);
const next = path.join(fe, ".next");
const routes = { "/": "index.html", "/leaderboard": "leaderboard.html", "/profile": "profile.html" };
const res = {};
for (const [route, file] of Object.entries(routes)) {
  const p = path.join(next, "server/app", file);
  if (!fs.existsSync(p)) { res[route] = null; continue; }
  const html = fs.readFileSync(p, "utf8");
  const srcs = [...new Set([...html.matchAll(/<script[^>]+src="(\/_next\/[^"?]+)/g)].map((m) => m[1]))];
  let raw = 0, gz = 0, missing = 0;
  for (const s of srcs) {
    const f = path.join(next, s.replace(/^\/_next\//, ""));
    if (!fs.existsSync(f)) { missing++; continue; }
    const buf = fs.readFileSync(f);
    raw += buf.length; gz += zlib.gzipSync(buf).length;
  }
  res[route] = { scripts: srcs.length, missingFiles: missing, rawKB: +(raw / 1024).toFixed(1), gzipKB: +(gz / 1024).toFixed(1) };
}
fs.writeFileSync(out, JSON.stringify(res, null, 2));
console.log("[first-load-js]", JSON.stringify(res));
