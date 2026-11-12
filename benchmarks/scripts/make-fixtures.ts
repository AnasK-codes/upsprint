// Builds k6/fixtures.json (or --out=path) from the seeded DB: JWTs and ids the k6 scripts need.
// Env: DATABASE_URL, JWT_SECRET (same value the API uses).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
// @ts-ignore
import { signJwt } from "../lib/jwt.mjs";

const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? path.resolve(import.meta.dirname, "../k6/fixtures.json");
const DB_URL = process.env.DATABASE_URL ?? "postgresql://bench:bench@localhost:5433/upsprint_bench";
const SECRET = process.env.JWT_SECRET ?? "bench-secret";
const tok = (userId: number) => signJwt({ userId }, SECRET, 7 * 86400);

const c = new pg.Client({ connectionString: DB_URL });
await c.connect();
const q = async (sql: string, p: any[] = []) => (await c.query(sql, p)).rows;

const rankUsers = (await q(`SELECT l."userId" id FROM "Leaderboard" l JOIN "User" u ON u.id=l."userId"
  WHERE u."leaderboardVisibility"='GLOBAL_AND_GROUPS' ORDER BY md5(l."userId"::text) LIMIT 1000`)).map((r) => r.id);

const combos = await q(`SELECT u.batch, u.branch, count(*)::int n FROM "User" u
  WHERE u."leaderboardVisibility"='GLOBAL_AND_GROUPS' AND u.batch IS NOT NULL AND u.branch IS NOT NULL
  GROUP BY 1,2 HAVING count(*) >= 3 ORDER BY n DESC`);

const pageCount = async (platform: string | null) => {
  const r = platform
    ? await q(`SELECT count(*)::int n FROM "LinkedAccount" la JOIN "User" u ON u.id=la."userId"
        WHERE la.platform=$1 AND u."leaderboardVisibility"='GLOBAL_AND_GROUPS'`, [platform])
    : await q(`SELECT count(*)::int n FROM "Leaderboard" l JOIN "User" u ON u.id=l."userId"
        WHERE u."leaderboardVisibility"='GLOBAL_AND_GROUPS'`);
  return Math.max(1, Math.ceil(r[0].n / 50));
};
const lastPage: Record<string, number> = {
  global: await pageCount(null),
  leetcode: await pageCount("leetcode"),
  codeforces: await pageCount("codeforces"),
  codechef: await pageCount("codechef"),
};

const groupMember = async (size: number) => {
  const g = await q(`SELECT g.id, count(*)::int n FROM "Group" g JOIN "GroupMember" m ON m."groupId"=g.id
    GROUP BY g.id ORDER BY abs(count(*) - $1), g.id LIMIT 1`, [size]);
  if (!g.length) return null;
  const m = await q(`SELECT "userId" FROM "GroupMember" WHERE "groupId"=$1 ORDER BY "userId" LIMIT 1`, [g[0].id]);
  return { groupId: g[0].id, members: g[0].n, token: tok(m[0].userId) };
};

// Users that do NOT yet have a CodeChef account: connect candidates (mutating tests consume them).
const cand = await q(`SELECT u.id FROM "User" u WHERE NOT EXISTS
  (SELECT 1 FROM "LinkedAccount" la WHERE la."userId"=u.id AND la.platform='codechef')
  ORDER BY md5(u.id::text) LIMIT 3000`);

const fixtures = {
  generatedAt: new Date().toISOString(),
  rankUsers,
  filters: combos.slice(0, 20).map((r) => ({ batch: r.batch, branch: r.branch })),
  lastPage,
  deepPage: Object.fromEntries(Object.entries(lastPage).map(([k, v]) => [k, Math.min(200, v)])),
  groups: { g50: await groupMember(50), g500: await groupMember(500) },
  connect: { platform: "codechef", candidates: cand.map((r) => ({ userId: r.id, username: `cc_${r.id}`, token: tok(r.id) })) },
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fixtures));
console.log(`[fixtures] ${out}: rankUsers=${rankUsers.length} filters=${fixtures.filters.length} connectCandidates=${cand.length}`,
  `lastPage=${JSON.stringify(lastPage)} groups=${JSON.stringify({ g50: fixtures.groups.g50?.members, g500: fixtures.groups.g500?.members })}`);
await c.end();
