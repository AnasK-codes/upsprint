// M10: sequential ingestion time against the mock platform server.
//   tsx scripts/time-sync.ts <out.json> [--full | --sample=300]
// --full   : time runAllSnapshots() over ALL linked accounts (the real cron job body).
// --sample : time processAccountSnapshot() sequentially over a deterministic sample of K accounts
//            (same loop as runAllSnapshots, fewer accounts). The result is a MEASUREMENT OF THE SAMPLE,
//            never extrapolated here. Start the mock with e.g. MOCK_LATENCY_MS=300 MOCK_ERROR_RATE=0.02 and
//            point *_BASE_URL at it (this script refuses to run unless they are set, so real platforms are never hit).
import fs from "node:fs";
// @ts-ignore
import { importBackend, prepareBackendEnv } from "../lib/backend-env.mjs";

const out = process.argv[2] ?? "sync.json";
const full = process.argv.includes("--full");
const sample = Number(process.argv.find((a) => a.startsWith("--sample="))?.slice(9) ?? 300);
const mock = process.env.MOCK_URL ?? "http://localhost:4100";
for (const k of ["LEETCODE_BASE_URL", "CODEFORCES_BASE_URL", "CODECHEF_BASE_URL"]) {
  if (!process.env[k] || !/localhost|127\.0\.0\.1/.test(process.env[k]!)) {
    console.error(`${k} must point at the local mock server (refusing to hit real platforms)`);
    process.exit(1);
  }
}
const stats = async () => (await fetch(`${mock}/__stats`)).json() as Promise<any>;
prepareBackendEnv();
const { default: prisma } = await importBackend("config/db.js");
const { processAccountSnapshot, runAllSnapshots } = await importBackend("jobs/snapshot.job.js");

const total = await prisma.linkedAccount.count();
const before = await stats();
const t = process.hrtime.bigint();
let accounts = total;
if (full) {
  await runAllSnapshots();
} else {
  const rows: any[] = await prisma.$queryRaw`SELECT * FROM "LinkedAccount" ORDER BY md5(id::text) LIMIT ${sample}`;
  accounts = rows.length;
  for (const acc of rows) await processAccountSnapshot(acc);
}
const durationMs = Number(process.hrtime.bigint() - t) / 1e6;
const after = await stats();
const res = {
  metric: "M10", mode: full ? "full" : `sample-${sample}`, linkedAccountsTotal: total, accountsProcessed: accounts,
  durationMs: Math.round(durationMs), perAccountMs: Math.round(durationMs / accounts),
  mockRequests: after.total - before.total, mockInjectedErrors: after.errors - before.errors,
  note: full ? "all accounts" : "measured on a sample; not extrapolated",
};
console.log("[sync]", JSON.stringify(res));
fs.writeFileSync(out, JSON.stringify(res, null, 2));
process.exit(0);
