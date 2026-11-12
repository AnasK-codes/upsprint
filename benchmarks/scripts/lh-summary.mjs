// Medians over Lighthouse JSON reports + first-load JS. Usage: node scripts/lh-summary.mjs <lighthouseOutDir> [next-build.log]
// Writes lighthouse-summary.json and lighthouse-summary.md. Medians are taken per metric across runs.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const buildLog = process.argv[3];
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const reports = fs.readdirSync(path.join(dir, "reports")).filter((f) => f.endsWith(".json"));
const pages = {};
for (const f of reports) {
  const [name] = f.split("-");
  const j = JSON.parse(fs.readFileSync(path.join(dir, "reports", f), "utf8"));
  const a = j.audits;
  const net = a["network-requests"]?.details?.items ?? [];
  const scriptBytes = net.filter((r) => r.resourceType === "Script").reduce((s, r) => s + (r.transferSize || 0), 0);
  (pages[name] ??= []).push({
    performance: Math.round((j.categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((j.categories.accessibility?.score ?? 0) * 100),
    lcpMs: a["largest-contentful-paint"]?.numericValue, cls: a["cumulative-layout-shift"]?.numericValue,
    tbtMs: a["total-blocking-time"]?.numericValue, scriptTransferKB: scriptBytes / 1024,
    finalUrl: j.finalDisplayedUrl ?? j.finalUrl,
  });
}
const result = { runsPerPage: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, v.length])), pages: {} };
for (const [name, runs] of Object.entries(pages)) {
  const m = (k) => median(runs.map((r) => r[k]));
  result.pages[name] = {
    performance: m("performance"), accessibility: m("accessibility"), lcpMs: m("lcpMs"), cls: m("cls"), tbtMs: m("tbtMs"),
    scriptTransferKB: m("scriptTransferKB"), finalUrls: [...new Set(runs.map((r) => r.finalUrl))],
  };
}
// First-load JS per route from scripts/first-load-js.mjs (scripts referenced by the prerendered HTML)
const fl = buildLog && fs.existsSync(buildLog) ? JSON.parse(fs.readFileSync(buildLog, "utf8")) : {};
result.firstLoadJS = fl;
fs.writeFileSync(path.join(dir, "lighthouse-summary.json"), JSON.stringify(result, null, 2));
const f1 = (n) => (n == null ? "n/a" : Number(n).toFixed(0)), f2 = (n) => (n == null ? "n/a" : Number(n).toFixed(3));
let md = "| Page | Perf | A11y | LCP (ms) | CLS | TBT (ms) | JS transferred on load (KB) |\n|---|---|---|---|---|---|---|\n";
for (const [n, p] of Object.entries(result.pages)) md += `| ${n} | ${p.performance} | ${p.accessibility} | ${f1(p.lcpMs)} | ${f2(p.cls)} | ${f1(p.tbtMs)} | ${f1(p.scriptTransferKB)} |\n`;
md += `\nMedian of ${Object.values(result.runsPerPage).join("/")} runs per page, per metric. "JS transferred" = sum of Script transfer sizes in Lighthouse's network-requests audit (cold load, mobile preset).\n\n`;
md += "First-load JS from the production build (scripts in the prerendered HTML; `next build` itself prints no sizes in Next 16):\n\n| Route | Scripts | Raw KB | Gzip KB |\n|---|---|---|---|\n";
for (const [r, v] of Object.entries(fl)) md += v ? `| ${r} | ${v.scripts} | ${v.rawKB} | ${v.gzipKB} |\n` : `| ${r} | n/a | n/a | n/a |\n`;
fs.writeFileSync(path.join(dir, "lighthouse-summary.md"), md);
console.log(md);
