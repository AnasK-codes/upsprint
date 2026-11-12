// EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) for every sql/NN_*.sql (not 90_*) against the bench DB.
//   tsx scripts/explain.ts <outDir>
// Each statement runs twice; the 2nd (warm-cache) plan is saved. Placeholders {{X}} are filled from the DB/fixtures.
// Also dumps pg_stat_statements top-10 (sql/90_*) to <outDir>/pg_stat_statements_top10.txt when --pgss is given.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const outDir = path.resolve(process.argv[2] ?? "./explain-out");
const pgssOnly = process.argv.includes("--pgss-only");
const DB_URL = process.env.DATABASE_URL ?? "postgresql://bench:bench@localhost:5433/upsprint_bench";
const sqlDir = path.resolve(import.meta.dirname, "../sql");
fs.mkdirSync(outDir, { recursive: true });

const c = new pg.Client({ connectionString: DB_URL });
await c.connect();

if (pgssOnly) {
  const q = fs.readFileSync(path.join(sqlDir, "90_pg_stat_statements_top10.sql"), "utf8");
  const r = await c.query(q);
  fs.writeFileSync(path.join(outDir, "pg_stat_statements_top10.json"), JSON.stringify(r.rows, null, 2));
  fs.writeFileSync(path.join(outDir, "pg_stat_statements_top10.txt"),
    r.rows.map((x, i) => `${i + 1}. mean=${x.mean_ms}ms max=${x.max_ms}ms calls=${x.calls} total=${x.total_ms}ms rows=${x.rows}\n   ${x.query}`).join("\n") + "\n");
  console.log(`[explain] pg_stat_statements top-10 -> ${outDir}`);
  await c.end();
  process.exit(0);
}

const one = async (sql: string, p: any[] = []) => (await c.query(sql, p)).rows;
const fixPath = path.resolve(import.meta.dirname, "../k6/fixtures.json");
const fx = fs.existsSync(fixPath) ? JSON.parse(fs.readFileSync(fixPath, "utf8")) : null;
const vars: Record<string, string> = {
  BATCH: fx?.filters?.[0]?.batch ?? (await one(`SELECT batch FROM "User" WHERE batch IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1`))[0].batch,
  BRANCH: fx?.filters?.[0]?.branch ?? "CSE",
  USER_ID: String(fx?.rankUsers?.[0] ?? (await one(`SELECT "userId" FROM "Leaderboard" LIMIT 1`))[0].userId),
  G50: String(fx?.groups?.g50?.groupId ?? 1),
  G500: String(fx?.groups?.g500?.groupId ?? 2),
  DEEP_OFFSET_CF: String(((fx?.deepPage?.codeforces ?? 1) - 1) * 50),
};
const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in vars)) throw new Error(`unknown placeholder ${k}`); return vars[k]; });

const files = fs.readdirSync(sqlDir).filter((f) => /^\d\d_.*\.sql$/.test(f) && !f.startsWith("90_")).sort();
const summary: any[] = [];
let combined = `# EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) - ${new Date().toISOString()}\n# vars: ${JSON.stringify(vars)}\n# second (warm) execution of each statement\n\n`;
for (const f of files) {
  const sql = fill(fs.readFileSync(path.join(sqlDir, f), "utf8")).trim().replace(/;\s*$/, "");
  const explain = `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`;
  await c.query(explain); // warm the cache
  const rows = await c.query(explain);
  const text = rows.rows.map((r: any) => r["QUERY PLAN"]).join("\n");
  fs.writeFileSync(path.join(outDir, f.replace(/\.sql$/, ".explain.txt")), text + "\n");
  combined += `## ${f}\n${text}\n\n`;
  const exec = /Execution Time: ([\d.]+) ms/.exec(text)?.[1];
  const plan = /Planning Time: ([\d.]+) ms/.exec(text)?.[1];
  const hit = /shared hit=(\d+)/.exec(text)?.[1], read = /read=(\d+)/.exec(text)?.[1];
  summary.push({ file: f, executionMs: exec ? Number(exec) : null, planningMs: plan ? Number(plan) : null, sharedHitTop: hit ? Number(hit) : null, readTop: read ? Number(read) : 0 });
  console.log(`[explain] ${f}: exec=${exec}ms planning=${plan}ms`);
}
fs.writeFileSync(path.join(outDir, "explain-all.txt"), combined);
fs.writeFileSync(path.join(outDir, "explain-summary.json"), JSON.stringify(summary, null, 2));
await c.end();
