// Builds <resultsDir>/summary.md from the raw outputs written by run-all.sh. Usage: tsx scripts/summarize.ts <resultsDir>
// Missing pieces are printed as "[MEASURE] not collected", never filled in.
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2]);
const rd = (f: string) => { try { return fs.readFileSync(path.join(dir, f), "utf8"); } catch { return null; } };
const rj = (f: string) => { const t = rd(f); return t ? JSON.parse(t) : null; };
const n = (x: any, d = 1) => (x == null || Number.isNaN(Number(x)) ? "n/a" : Number(x).toFixed(d));
const NC = "[MEASURE] not collected";
const machine = rd("machine.txt") ?? "";
const mget = (k: string) => new RegExp(`^${k}: (.*)$`, "m").exec(machine)?.[1] ?? "?";
const events = (rd("events.log") ?? "").split("\n").filter(Boolean);

let md = `# Benchmark summary: ${mget("label")} / ${mget("users")} users\n\n`;
md += `Generated ${new Date().toISOString()} by scripts/summarize.ts from the raw files in this directory.\n\n`;

// ---- warnings
const warn: string[] = [];
if (/QUICK=1/.test(mget("knobs"))) warn.push("QUICK mode was used: short phases and tiny samples. **Do not report these numbers.**");
if (mget("git_dirty_files") !== "0") warn.push(`Working tree had ${mget("git_dirty_files")} modified tracked file(s) when this ran.`);
if (!/^baseline-v1-bench$/.test(mget("git_branch"))) warn.push(`Branch was \`${mget("git_branch")}\`, not baseline-v1-bench.`);
for (const e of events) if (/API_CRASHED|ERROR|WARN|SKIP/.test(e)) warn.push(e.replace(/^\d+ /, ""));
if (warn.length) md += `## Warnings\n\n${[...new Set(warn)].map((w) => `- ${w}`).join("\n")}\n\n`;

// ---- machine
md += `## Machine and run\n\n\`\`\`\n${machine.trim()}\n\`\`\`\n\n`;
const seedInfo = rd("seed-info.txt");
if (seedInfo) md += `Seed:\n\n\`\`\`\n${seedInfo.trim()}\n\`\`\`\n\n`;

// ---- k6 table
const metricNum = (name: string) => Number(/^m(\d+)-/.exec(name)?.[1] ?? 99);
const k6dir = path.join(dir, "k6");
const rows: any[] = fs.existsSync(k6dir) ? fs.readdirSync(k6dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(k6dir, f), "utf8")) })) : [];
md += `## Load tests (k6, constant arrival rate; latency in ms)\n\n`;
if (!rows.length) md += `${NC}\n\n`;
else {
  md += `| Metric | Script | Mode | Cache | Variant | Target rate | p50 | p95 | p99 | max | Achieved req/s | Unexpected-status % | Dropped iters |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  const order = (r: any) => metricNum(r.name);
  rows.sort((a, b) => order(a) - order(b) || (a.mode === "cold" ? -1 : 1) - (b.mode === "cold" ? -1 : 1) || a.file.localeCompare(b.file));
  for (const r of rows) {
    const m = `M${metricNum(r.name)}`;
    const variant = r.file.replace(/\.json$/, "").split(".").slice(2).filter((x: string) => x !== r.cache).join(".");
    const rate = r.config?.rate != null ? `${r.config.rate}/${r.config.timeUnit ?? "1s"}` : "burst";
    md += `| ${m} | ${r.name} | ${r.mode} | ${r.cache ?? "-"} | ${variant || "-"} | ${rate} | ${n(r.latencyMs?.p50, 1)} | ${n(r.latencyMs?.p95, 1)} | ${n(r.latencyMs?.p99, 1)} | ${n(r.latencyMs?.max, 1)} | ${n(r.reqPerSec, 2)} | ${n((r.unexpectedStatusRate ?? 0) * 100, 2)} | ${r.droppedIterations ?? 0} |\n`;
  }
  md += `\nNotes: \`cache=hit\` repeats identical URLs, so the API's 60 s in-memory cache serves most requests (it measures the cache path); \`cache=miss\` pads the \`page\` parameter so every request has a unique cache key and runs the real query. Cold runs start right after an API restart with no warm-up; the Postgres buffer cache is not dropped. Rows with dropped iterations or non-zero error rates were not sustainable at the target rate.\n\n`;
}
const m9 = rows.find((r) => r.name === "m9-connect"), m14 = rows.find((r) => r.name === "m14-concurrent-connect");
if (m9) md += `M9 (connect, mock at 300 ms): ${m9.connectOk ?? 0} succeeded, ${m9.connectFail ?? 0} failed.\n\n`;
if (m14) {
  const statuses: Record<string, number> = {};
  for (const l of (rd("logs/k6-m14-concurrent-connect.log") ?? "").split("\n")) {
    const m = /m14.*status\\?"?:(\d+)/.exec(l);
    if (m) statuses[m[1]] = (statuses[m[1]] ?? 0) + 1;
  }
  md += `M14 (10 simultaneous connects): ok=${m14.connectOk ?? 0}, failed=${m14.connectFail ?? 0}; statuses ${JSON.stringify(statuses)}; API log lines matching unique-violation/rebuild-failed/deadlock: ${(rd("m14-api-error-lines.txt") ?? "?").trim()}.\n\n`;
}

// ---- M7
md += `## M7: database cost\n\n`;
const ex = rj("explain/explain-summary.json");
if (ex) {
  md += `EXPLAIN (ANALYZE, BUFFERS) execution time, second (warm) run; full plans in \`explain/\`.\n\n| SQL file | Execution ms | Planning ms |\n|---|---|---|\n` + ex.map((e: any) => `| ${e.file} | ${n(e.executionMs, 2)} | ${n(e.planningMs, 2)} |`).join("\n") + "\n\n";
} else md += `${NC}\n\n`;
const pg = rd("explain/pg_stat_statements_top10.txt");
md += `Top 10 statements by mean time after the read-only k6 phase (stats reset before it):\n\n${pg ? "```\n" + pg.trim() + "\n```" : NC}\n\n`;
if (fs.existsSync(path.join(dir, "sql/prisma-queries.log"))) md += `Prisma-generated SQL for each endpoint was captured in \`sql/prisma-queries.log\`.\n\n`;

// ---- M8, M10, M12, M13, M15
md += `## M8: rebuildLeaderboard()\n\n`;
const rb = rj("rebuild.json");
md += rb ? `${rb.runs.map((r: any) => `run ${r.run}: ${r.wallMs} ms`).join(", ")}; median ${rb.medianWallMs} ms; ${rb.runs[0].totalUsers} users ranked from ${rb.runs[0].snapshots} latest snapshots.\n\n` : `${NC}\n\n`;

md += `## M10: ingestion (mock platform: 300 ms latency, 2% injected errors)\n\n`;
const sy = rj("sync.json");
md += sy ? `${sy.mode}: ${sy.accountsProcessed} of ${sy.linkedAccountsTotal} accounts in ${sy.durationMs} ms (${sy.perAccountMs} ms/account), mock requests ${sy.mockRequests}, injected errors ${sy.mockInjectedErrors}. ${sy.note}.\n\n` : `${NC}\n\n`;
md += `## M11: data freshness\n\n[MEASURE] derived later from the cron schedule (6 h snapshot + daily 01:00 rebuild) and M10; not computed here.\n\n`;

md += `## M12: storage\n\n`;
const sz = rj("table-sizes.json");
if (sz) {
  const mb = (b: number) => (b / 1048576).toFixed(1);
  md += `| Table | Rows (est.) | Total MB | Heap MB | Index MB | TOAST MB |\n|---|---|---|---|---|---|\n` + sz.tables.map((t: any) => `| ${t.table} | ${t.rows_est} | ${mb(t.total_bytes)} | ${mb(t.heap_bytes)} | ${mb(t.index_bytes)} | ${mb(t.toast_bytes)} |`).join("\n");
  const p = sz.platformSnapshot;
  md += `\n\nPlatformSnapshot: ${p.rows} rows over ${p.spanDays} days for ${p.accountsWithSnapshots} accounts = ${p.rowsPerAccountPerMonth} rows/account/month, ${p.bytesPerRow} bytes/row (heap+index+TOAST).\n\n`;
} else md += `${NC}\n\n`;

md += `## M13: API process memory (RSS)\n\n`;
const csv = rd("rss.csv");
if (csv) {
  const pts = csv.trim().split("\n").slice(1).map((l) => l.split(",").map(Number)).filter((x) => x.length === 3 && !x.some(Number.isNaN));
  const ts = (tag: string) => Number(events.find((e) => e.includes(tag))?.split(" ")[0]);
  const rs = ts("PHASE read-start"), re = ts("PHASE read-end");
  const peak = (a: number[][]) => (a.length ? Math.max(...a.map((x) => x[2])) / 1024 : null);
  md += `Peak RSS during read-only load phase: ${n(peak(pts.filter((x) => x[0] >= rs && x[0] <= re)), 0)} MB; whole run (includes rebuild, connect, sync): ${n(peak(pts), 0)} MB (${pts.length} samples at 1 Hz; the API is restarted between phases, so this is the peak of any process instance).\n\n`;
} else md += `${NC}\n\n`;

md += `## M15: rank consistency\n\n`;
const rc = rj("rank-consistency.json");
md += rc ? `${rc.mismatched} of ${rc.checked} listed users (${rc.mismatchPct}%) have a /leaderboard/user/:id rank different from their position in the paged list${rc.sampled ? " (deterministic sample)" : ""}; max absolute difference ${rc.maxAbsRankDifference}; ${rc.notFoundOnUserEndpoint} not found. Examples: ${JSON.stringify(rc.examples.slice(0, 3))}\n\n` : `${NC}\n\n`;

md += `## M18: frontend (Lighthouse, mobile)\n\n`;
md += rd("lighthouse/lighthouse-summary.md") ?? `${NC} (lighthouse not installed or skipped; run benchmarks/lighthouse.sh)\n`;
md += `\n`;
fs.writeFileSync(path.join(dir, "summary.md"), md);
console.log(`wrote ${path.join(dir, "summary.md")}`);
