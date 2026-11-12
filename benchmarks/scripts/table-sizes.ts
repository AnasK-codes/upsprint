// M12: table / index / TOAST sizes and snapshot density. Usage: tsx scripts/table-sizes.ts <out.json>
import fs from "node:fs";
import pg from "pg";

const out = process.argv[2] ?? "table-sizes.json";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://bench:bench@localhost:5433/upsprint_bench" });
await c.connect();
const tables = (await c.query(`
  SELECT c.relname AS table, c.reltuples::bigint AS rows_est,
         pg_total_relation_size(c.oid) AS total_bytes,
         pg_relation_size(c.oid) AS heap_bytes,
         pg_indexes_size(c.oid) AS index_bytes,
         COALESCE(pg_total_relation_size(c.reltoastrelid), 0) AS toast_bytes
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY total_bytes DESC`)).rows
  .map((r) => ({ ...r, total_bytes: Number(r.total_bytes), heap_bytes: Number(r.heap_bytes), index_bytes: Number(r.index_bytes), toast_bytes: Number(r.toast_bytes), rows_est: Number(r.rows_est) }));
const s = (await c.query(`SELECT count(*)::bigint AS snaps, count(DISTINCT "linkedAccountId")::int AS accounts,
  min("createdAt") AS first, max("createdAt") AS last FROM "PlatformSnapshot"`)).rows[0];
const snaps = Number(s.snaps);
const spanDays = Math.max(1, (new Date(s.last).getTime() - new Date(s.first).getTime()) / 86400000);
const snapT = tables.find((t) => t.table === "PlatformSnapshot");
const res = {
  metric: "M12", tables,
  platformSnapshot: {
    rows: snaps, accountsWithSnapshots: s.accounts, spanDays: Number(spanDays.toFixed(1)),
    rowsPerAccountPerMonth: s.accounts ? Number((snaps / s.accounts / (spanDays / 30.4375)).toFixed(1)) : null,
    totalBytes: snapT?.total_bytes, bytesPerRow: snapT ? Math.round(snapT.total_bytes / Math.max(1, snaps)) : null,
  },
};
const mb = (b: number) => (b / 1048576).toFixed(1);
console.log("[sizes]\n" + tables.map((t) => `  ${t.table.padEnd(18)} total=${mb(t.total_bytes)} MB heap=${mb(t.heap_bytes)} idx=${mb(t.index_bytes)} toast=${mb(t.toast_bytes)}`).join("\n"));
console.log("[sizes] PlatformSnapshot:", JSON.stringify(res.platformSnapshot));
fs.writeFileSync(out, JSON.stringify(res, null, 2));
await c.end();
