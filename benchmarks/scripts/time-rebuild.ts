// M8: rebuildLeaderboard() duration. Usage: tsx scripts/time-rebuild.ts <out.json> [runs=3]
// Imports the built backend (backend/dist) and calls the real function against the bench DB.
import fs from "node:fs";
// @ts-ignore
import { importBackend } from "../lib/backend-env.mjs";

const out = process.argv[2] ?? "rebuild.json";
const runs = Number(process.argv[3] ?? 3);
const { rebuildLeaderboard } = await importBackend("jobs/leaderboard.job.js");
const results: any[] = [];
for (let i = 0; i < runs; i++) {
  const t = process.hrtime.bigint();
  const r = await rebuildLeaderboard();
  const wallMs = Number(process.hrtime.bigint() - t) / 1e6;
  results.push({ run: i + 1, wallMs: Math.round(wallMs), reportedDurationMs: r.durationMs, totalUsers: r.totalUsers, snapshots: r.snapshots });
  console.log(`[rebuild] run ${i + 1}: ${Math.round(wallMs)} ms (users=${r.totalUsers}, latest snapshots=${r.snapshots})`);
}
const walls = results.map((r) => r.wallMs).sort((a, b) => a - b);
fs.writeFileSync(out, JSON.stringify({ metric: "M8", runs: results, medianWallMs: walls[Math.floor(walls.length / 2)], minWallMs: walls[0], maxWallMs: walls[walls.length - 1] }, null, 2));
process.exit(0);
