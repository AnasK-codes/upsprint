// Deterministic seeder for the UpSprint benchmark database.
//   npm run seed -- --users=1000
// Flags: --users=N (required) --seed=1 --days=180 --snapshots-per-day=4
//        --anchor=YYYY-MM-DD (default today UTC) --database-url=... --yes
//        --no-checksum --skip-rebuild
// Safety: truncates every table, and refuses databases whose name does not contain "bench".
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
// @ts-ignore plain JS module shared with the mock server
import {
  DAY, dayStart, fnv1a, mulberry32, profileFor, calendarString,
  leetcodeData, codeforcesUser,
} from "../lib/gen.mjs";

// ---------- args ----------
const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? "true");
}
const num = (k: string, d: number) => (args.has(k) ? Number(args.get(k)) : d);
const N = num("users", 0);
if (!Number.isInteger(N) || N <= 0) {
  console.error("usage: npm run seed -- --users=N [--seed --days --snapshots-per-day --anchor --yes]");
  process.exit(1);
}
const SEED = String(args.get("seed") ?? "1");
const DAYS = num("days", 180);
const SPD = num("snapshots-per-day", 4);
const anchorStr = args.get("anchor") ?? new Date().toISOString().slice(0, 10);
const ANCHOR = dayStart(Math.floor(Date.parse(anchorStr + "T00:00:00Z") / 1000));
const DB_URL = args.get("database-url") ?? process.env.DATABASE_URL ?? "postgresql://bench:bench@localhost:5433/upsprint_bench";
const dbName = new URL(DB_URL).pathname.slice(1);
if (!dbName.includes("bench")) {
  console.error(`Refusing to seed "${dbName}": database name must contain "bench".`);
  process.exit(1);
}

const P_LC = 0.8, P_CF = 0.5, P_CC = 0.3, P_GROUPS_ONLY = 0.1;
const BRANCHES: [string, number][] = [["CSE", 0.3], ["IT", 0.18], ["ECE", 0.16], ["ME", 0.12], ["EE", 0.1], ["CE", 0.08], ["CHE", 0.06]];
const BATCHES: [string, number][] = [["2021", 0.06], ["2022", 0.12], ["2023", 0.18], ["2024", 0.24], ["2025", 0.22], ["2026", 0.12], ["2027", 0.06]];

function pick<T>(rng: () => number, table: [T, number][]): T {
  let r = rng();
  for (const [v, w] of table) { if ((r -= w) < 0) return v; }
  return table[table.length - 1][0];
}
const iso = (unix: number) => new Date(unix * 1000).toISOString();

// ---------- size estimate ----------
const accountsEst = Math.round(N * (P_LC + P_CF + P_CC));
const snapsEst = accountsEst * DAYS * SPD;
const bytesEst = Math.round(N * P_LC) * DAYS * SPD * 1700 + Math.round(N * P_CF) * DAYS * SPD * 700 + Math.round(N * P_CC) * DAYS * SPD * 250;
console.log(`[seed] users=${N} days=${DAYS} snapshots/day=${SPD} anchor=${anchorStr} seed=${SEED}`);
console.log(`[seed] estimate: ~${accountsEst.toLocaleString()} accounts, ~${snapsEst.toLocaleString()} snapshot rows, ~${(bytesEst / 1e9).toFixed(1)} GB incl. TOAST (calibrated on a 1k-user run; actual sizes printed at the end)`);
if (snapsEst > 20_000_000 && !args.has("yes")) {
  console.error("[seed] more than 20M snapshot rows. Reduce --days/--snapshots-per-day (see README tiers) or pass --yes.");
  process.exit(1);
}

// ---------- db helpers ----------
type Col = { name: string; type: string; cast?: string };
const client = new pg.Client({ connectionString: DB_URL });

async function insert(table: string, cols: Col[], rows: any[][]) {
  if (!rows.length) return;
  const sel = cols.map((c, i) => `${c.cast ? `x${i}::${c.cast}` : `x${i}`}`).join(", ");
  const un = cols.map((_, i) => `$${i + 1}::${cols[i].type}[]`).join(", ");
  const as = cols.map((_, i) => `x${i}`).join(", ");
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c.name}"`).join(", ")}) SELECT ${sel} FROM unnest(${un}) AS t(${as})`;
  await client.query(sql, cols.map((_, i) => rows.map((r) => r[i])));
}

class Batcher {
  rows: any[][] = [];
  chars = 0;
  total = 0;
  constructor(private table: string, private cols: Col[], private maxRows = 10000, private maxChars = 6_000_000) {}
  async add(row: any[], size = 0) {
    this.rows.push(row);
    this.chars += size;
    if (this.rows.length >= this.maxRows || this.chars >= this.maxChars) await this.flush();
  }
  async flush() {
    if (!this.rows.length) return;
    this.total += this.rows.length;
    await insert(this.table, this.cols, this.rows);
    this.rows = [];
    this.chars = 0;
  }
}

const t0 = Date.now();
const lap = (msg: string) => console.log(`[seed] ${((Date.now() - t0) / 1000).toFixed(1)}s ${msg}`);

await client.connect();
await client.query(`TRUNCATE "Leaderboard","DailyActivity","PlatformSnapshot","LinkedAccount","GroupMember","Group","User","JobRun" RESTART IDENTITY CASCADE`);
lap("truncated");

// ---------- users ----------
const userCols: Col[] = [
  { name: "id", type: "int" }, { name: "email", type: "text" }, { name: "name", type: "text" },
  { name: "batch", type: "text" }, { name: "branch", type: "text" },
  { name: "createdAt", type: "timestamp" },
  { name: "leaderboardVisibility", type: "text", cast: `"LeaderboardVisibility"` },
];
type U = { id: number; platforms: string[] };
const users = new Batcher("User", userCols, 5000);
const userAccounts: { userId: number; platform: string }[] = [];
const groupsOnly = new Set<number>();
for (let id = 1; id <= N; id++) {
  const rng = mulberry32(fnv1a(`${SEED}:u:${id}`));
  const vis = rng() < P_GROUPS_ONLY ? "GROUPS_ONLY" : "GLOBAL_AND_GROUPS";
  if (vis === "GROUPS_ONLY") groupsOnly.add(id);
  await users.add([
    id, `user${id}@bench.local`, `Bench User ${id}`, pick(rng, BATCHES), pick(rng, BRANCHES),
    iso(ANCHOR - Math.floor(rng() * 400) * DAY), vis,
  ]);
  if (rng() < P_LC) userAccounts.push({ userId: id, platform: "leetcode" });
  if (rng() < P_CF) userAccounts.push({ userId: id, platform: "codeforces" });
  if (rng() < P_CC) userAccounts.push({ userId: id, platform: "codechef" });
}
await users.flush();
await client.query(`SELECT setval(pg_get_serial_sequence('"User"','id'), $1)`, [N]);
lap(`users: ${users.total}`);

// ---------- groups ----------
const groupCols: Col[] = [
  { name: "id", type: "int" }, { name: "name", type: "text" }, { name: "description", type: "text" },
  { name: "code", type: "text" }, { name: "createdAt", type: "timestamp" }, { name: "updatedAt", type: "timestamp" },
];
const gmCols: Col[] = [
  { name: "userId", type: "int" }, { name: "groupId", type: "int" }, { name: "role", type: "text" },
  { name: "joinedAt", type: "timestamp" },
];
{
  const grng = mulberry32(fnv1a(`${SEED}:groups`));
  const sizes: number[] = [Math.min(50, N), Math.min(500, N)];
  const small = Math.max(1, Math.floor(N / 15));
  for (let i = 0; i < small; i++) sizes.push(3 + Math.floor(grng() * 28)); // 3..30
  const groups = new Batcher("Group", groupCols, 5000);
  const gms = new Batcher("GroupMember", gmCols, 10000);
  const created = iso(ANCHOR - 100 * DAY);
  let members = 0;
  for (let g = 0; g < sizes.length; g++) {
    const gid = g + 1;
    const size = Math.min(sizes[g], N);
    const name = g === 0 ? "Bench Group 50" : g === 1 ? "Bench Group 500" : `Bench Small Group ${gid}`;
    await groups.add([gid, name, null, "B" + gid.toString(36).toUpperCase().padStart(5, "0"), created, created]);
    // distinct members: sparse Fisher-Yates over 1..N
    const swapped = new Map<number, number>();
    for (let k = 0; k < size; k++) {
      const j = k + Math.floor(grng() * (N - k));
      const vj = swapped.get(j) ?? j + 1;
      const vk = swapped.get(k) ?? k + 1;
      swapped.set(j, vk);
      swapped.set(k, vj);
      await gms.add([vj, gid, k === 0 ? "ADMIN" : "MEMBER", iso(ANCHOR - Math.floor(grng() * 90) * DAY)]);
      members++;
    }
  }
  await groups.flush();
  await gms.flush();
  await client.query(`SELECT setval(pg_get_serial_sequence('"Group"','id'), $1)`, [sizes.length]);
  lap(`groups: ${sizes.length} (50, ${Math.min(500, N)}, ${small} small), memberships: ${members}`);
}

// ---------- accounts, activity, snapshots ----------
const accCols: Col[] = [
  { name: "id", type: "int" }, { name: "userId", type: "int" }, { name: "platform", type: "text" },
  { name: "username", type: "text" }, { name: "createdAt", type: "timestamp" },
  { name: "currentStreak", type: "int" }, { name: "lastActivityDate", type: "timestamp" },
  { name: "totalActiveDays", type: "int" },
];
const actCols: Col[] = [
  { name: "linkedAccountId", type: "int" }, { name: "date", type: "timestamp" }, { name: "count", type: "int" },
  { name: "createdAt", type: "timestamp" }, { name: "updatedAt", type: "timestamp" },
];
const snapCols: Col[] = [
  { name: "linkedAccountId", type: "int" }, { name: "rating", type: "int" }, { name: "problemsSolved", type: "int" },
  { name: "rawData", type: "text", cast: "jsonb" }, { name: "createdAt", type: "timestamp" }, { name: "rankTitle", type: "text" },
];
const prefix: Record<string, string> = { leetcode: "lc_", codeforces: "cf_", codechef: "cc_" };
const accB = new Batcher("LinkedAccount", accCols, 5000);
const actB = new Batcher("DailyActivity", actCols, 20000);
const snapB = new Batcher("PlatformSnapshot", snapCols, 10000, 8_000_000);

// Accounts must exist before dependents (FK), so insert them first.
type Acc = { id: number; userId: number; platform: string; username: string };
const accounts: Acc[] = userAccounts.map((a, i) => ({ id: i + 1, ...a, username: `${prefix[a.platform]}${a.userId}` }));
const accStats = new Map<number, { streak: number; last: number | null; active: number; activity?: Map<number, number> }>();
for (const a of accounts) {
  let st = { streak: 0, last: null as number | null, active: 0, activity: undefined as Map<number, number> | undefined };
  if (a.platform === "leetcode") {
    const activity = profileFor(a.username, ANCHOR).leetcode.activity as Map<number, number>;
    let last = 0;
    for (const d of activity.keys()) if (d > last) last = d;
    // same walk-back-from-today/yesterday rule as processAccountSnapshot
    let d = ANCHOR, streak = 0;
    if (!activity.has(d)) d -= DAY;
    while (activity.has(d)) { streak++; d -= DAY; }
    st = { streak, last: last || null, active: activity.size, activity };
  }
  accStats.set(a.id, st);
  await accB.add([a.id, a.userId, a.platform, a.username, iso(ANCHOR - 200 * DAY), st.streak, st.last ? iso(st.last) : null, st.active]);
}
await accB.flush();
await client.query(`SELECT setval(pg_get_serial_sequence('"LinkedAccount"','id'), $1)`, [Math.max(1, accounts.length)]);
lap(`accounts: ${accounts.length}`);

const K = DAYS * SPD;
let sizeSum = 0, sizeCnt = 0;
let doneAcc = 0;
for (const a of accounts) {
  const rng = mulberry32(fnv1a(`${SEED}:s:${a.id}`));
  const prof = profileFor(a.username, ANCHOR);
  const st = accStats.get(a.id)!;

  if (a.platform === "leetcode") {
    for (const [d, c] of st.activity!) {
      await actB.add([a.id, iso(d), c, iso(ANCHOR), iso(ANCHOR)]);
    }
  }

  const calCache = new Map<number, string>();
  for (let day = 0; day < DAYS; day++) {
    const dayUnix = ANCHOR - (DAYS - 1 - day) * DAY;
    let cal = "";
    if (a.platform === "leetcode") cal = calendarString(st.activity!, dayUnix);
    for (let s = 0; s < SPD; s++) {
      const k = day * SPD + s;
      const f = K > 1 ? k / (K - 1) : 1;
      const ts = dayUnix + Math.floor((s * DAY) / SPD) + Math.floor(rng() * 1800);
      const noise = Math.round((rng() - 0.5) * 20);
      let rating: number | null, solved: number | null, title: string | null, raw: any;
      if (a.platform === "leetcode") {
        const p = prof.leetcode, sc = 0.35 + 0.65 * f;
        const e = Math.round(p.easy * sc), m = Math.round(p.medium * sc), h = Math.round(p.hard * sc);
        rating = p.rating ? Math.round(p.rating - (1 - f) * 150 + noise) : null;
        solved = e + m + h; title = null;
        raw = leetcodeData(a.username, { ...p, easy: e, medium: m, hard: h, total: solved, rating }, cal);
      } else if (a.platform === "codeforces") {
        const p = prof.codeforces;
        rating = Math.round(p.rating - (1 - f) * 200 + noise);
        const maxR = Math.max(rating, p.maxRating - Math.round((1 - f) * 100));
        solved = maxR; // app stores maxRating in problemsSolved for Codeforces
        raw = codeforcesUser(a.username, { ...p, rating, maxRating: maxR }, ts);
        title = raw.rank;
      } else {
        const p = prof.codechef;
        rating = Math.round(p.rating - (1 - f) * 150 + noise);
        solved = null;
        raw = { rating, globalRank: p.globalRank, countryRank: p.countryRank };
        title = rating < 1400 ? "1★" : rating < 1600 ? "2★" : rating < 1800 ? "3★" : rating < 2000 ? "4★" : rating < 2200 ? "5★" : "6★";
      }
      const json = JSON.stringify(raw);
      sizeSum += json.length; sizeCnt++;
      await snapB.add([a.id, rating, solved, json, iso(ts), title], json.length);
    }
  }
  if (++doneAcc % 500 === 0) lap(`  accounts processed ${doneAcc}/${accounts.length}, snapshots ${snapB.total + snapB.rows.length}`);
}
await actB.flush();
await snapB.flush();
lap(`daily activity rows: ${actB.total}, snapshots: ${snapB.total} (avg rawData ${sizeCnt ? Math.round(sizeSum / sizeCnt) : 0} B JSON)`);

// ---------- leaderboard rebuild + vacuum ----------
if (!args.has("skip-rebuild")) {
  const jobPath = path.resolve(import.meta.dirname, "../../backend/dist/jobs/leaderboard.job.js");
  if (!fs.existsSync(jobPath)) {
    console.error(`[seed] ${jobPath} missing: run "npm run build" in backend/ first (or pass --skip-rebuild).`);
    process.exit(1);
  }
  const defaults: Record<string, string> = {
    DATABASE_URL: DB_URL, JWT_SECRET: "bench", JWT_EXPIRES_IN: "7d", GOOGLE_CLIENT_ID: "bench",
    GOOGLE_CLIENT_SECRET: "bench", GOOGLE_CALLBACK_URL: "http://localhost:4000/cb", FRONTEND_URL: "http://localhost:3000",
    NODE_ENV: "production", ADMIN_EMAILS: "admin@bench.local", NEXT_PUBLIC_API_URL: "http://localhost:4000",
  };
  process.env.DATABASE_URL = DB_URL; // never let a stray backend/.env point the rebuild at another DB
  for (const [k, v] of Object.entries(defaults)) process.env[k] ??= v;
  const { rebuildLeaderboard } = await import(pathToFileURL(jobPath).href);
  const r = await rebuildLeaderboard();
  lap(`rebuildLeaderboard(): ${JSON.stringify(r)}`);
}

for (const t of ["User", "Group", "GroupMember", "LinkedAccount", "PlatformSnapshot", "DailyActivity", "Leaderboard", "JobRun"]) {
  await client.query(`VACUUM (ANALYZE) "${t}"`);
}
lap("VACUUM ANALYZE done");
await client.query(`SELECT pg_stat_statements_reset()`).catch(() => {});

const sizes = await client.query(`
  SELECT relname AS table, n_live_tup AS rows_est,
         pg_size_pretty(pg_total_relation_size(relid)) AS total,
         pg_size_pretty(pg_relation_size(relid)) AS heap
  FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC`);
console.table(sizes.rows);

if (!args.has("no-checksum")) {
  const cs = await client.query(`
    SELECT
      (SELECT count(*) FROM "User") users,
      (SELECT count(*) FROM "LinkedAccount") accounts,
      (SELECT count(*) FROM "PlatformSnapshot") snapshots,
      (SELECT count(*) FROM "DailyActivity") activity,
      (SELECT count(*) FROM "Leaderboard") leaderboard,
      (SELECT md5(string_agg(id||':'||"linkedAccountId"||':'||coalesce(rating,-1)||':'||"createdAt"::text||':'||md5("rawData"::text), ',' ORDER BY id)) FROM "PlatformSnapshot") snapshot_md5,
      (SELECT md5(string_agg("linkedAccountId"||':'||date::text||':'||count, ',' ORDER BY "linkedAccountId", date) ) FROM "DailyActivity") activity_md5,
      (SELECT md5(string_agg("userId"||':'||score||':'||rank, ',' ORDER BY "userId")) FROM "Leaderboard") leaderboard_md5`);
  console.log("[seed] checksum:", JSON.stringify(cs.rows[0]));
}
await client.end();
lap("done");
process.exit(0); // backend's prisma pool keeps the loop alive
