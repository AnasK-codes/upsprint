// M15: rank consistency. For every listed user (or a deterministic sample), compare the rank returned by
// GET /leaderboard/user/:id with the user's position in the paged GET /leaderboard list.
//   tsx scripts/rank-consistency.ts <out.json> [--max=5000] [--base=http://localhost:4000]
import fs from "node:fs";

const out = process.argv[2] ?? "rank-consistency.json";
const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BASE = arg("base", "http://localhost:4000");
const MAX = Number(arg("max", "5000"));
const LIMIT = 100;

const getJson = async (p: string) => {
  const r = await fetch(BASE + p);
  return { status: r.status, body: r.status === 200 ? ((await r.json()) as any) : null };
};

const listed: { userId: number; position: number }[] = [];
for (let page = 1; ; page++) {
  const { status, body } = await getJson(`/leaderboard?page=${page}&limit=${LIMIT}`);
  if (status !== 200) throw new Error(`list page ${page} -> ${status}`);
  if (!body.data.length) break;
  for (const row of body.data) listed.push({ userId: row.userId, position: row.rank }); // row.rank = skip+index+1
}
// deterministic sample if the list is larger than MAX
let users = listed;
if (users.length > MAX) {
  const step = users.length / MAX;
  users = Array.from({ length: MAX }, (_, i) => listed[Math.floor(i * step)]);
}
let mismatched = 0, missing = 0, maxAbs = 0, idx = 0;
const examples: any[] = [];
async function worker() {
  while (idx < users.length) {
    const u = users[idx++];
    const { status, body } = await getJson(`/leaderboard/user/${u.userId}`);
    if (status !== 200) { missing++; continue; }
    const diff = body.rank - u.position;
    if (diff !== 0) {
      mismatched++; maxAbs = Math.max(maxAbs, Math.abs(diff));
      if (examples.length < 10) examples.push({ userId: u.userId, listPosition: u.position, userEndpointRank: body.rank });
    }
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
const checked = users.length - missing;
const res = {
  metric: "M15", listedUsers: listed.length, checked, sampled: users.length < listed.length, mismatched,
  mismatchPct: checked ? Number(((mismatched / checked) * 100).toFixed(2)) : null, notFoundOnUserEndpoint: missing,
  maxAbsRankDifference: maxAbs, examples,
};
console.log("[rank]", JSON.stringify(res));
fs.writeFileSync(out, JSON.stringify(res, null, 2));
