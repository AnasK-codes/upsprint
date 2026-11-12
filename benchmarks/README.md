# UpSprint benchmarks

Harness for measuring the **baseline** app (`baseline-v1`). Read [METHODOLOGY.md](METHODOLOGY.md) first:
it lists the five app-code hooks and the rules for comparable numbers.

Contents: `docker-compose.bench.yml` (Postgres 16, 2 CPU / 2 GB, `pg_stat_statements`, port 5433),
`mock-platforms/` (fake LeetCode / Codeforces / CodeChef), `seed/` (deterministic seeder),
`lib/gen.mjs` (shared generators), `results/` (raw outputs).

## Prerequisites

Node 22+, Docker (on macOS with Colima: `colima start --cpu 4 --memory 6`), and k6 for Step 0.3.
Dependencies are local to `benchmarks/` (`pg`, `tsx`); nothing global.

```bash
cd benchmarks && npm install
```

## Start everything

1. Database (port 5433, user/password/db `bench`/`bench`/`upsprint_bench`):
```bash
npm run db:up
```
2. Apply the app's migrations to it:
```bash
npm run db:migrate
```
3. Build the backend (the seeder calls `rebuildLeaderboard()` from `backend/dist`):
```bash
(cd ../backend && npm run build)
```
4. Mock platforms on :4100 (leave running in its own terminal). Optional: `MOCK_LATENCY_MS=300 MOCK_JITTER_MS=50 MOCK_ERROR_RATE=0.02`:
```bash
npm run mock
```
5. Seed (truncates the bench DB; refuses any database whose name lacks "bench"). Pin `--anchor` for reproducible datasets:
```bash
npm run seed -- --users=1000 --anchor=2026-11-12
```
6. Run the API against the bench DB with the hooks set:
```bash
cp .env.bench.example .env.bench
(cd ../backend && set -a && . ../benchmarks/.env.bench && set +a && node dist/server.js)
```
7. Smoke checks:
```bash
curl -s localhost:4000/leaderboard | head -c 300
npm run verify
```

`npm run verify` runs the built backend services against the mock and checks they parse every response and that real URLs remain the defaults.

## Seeder flags

`--users=N` (required), `--seed=1`, `--days=180`, `--snapshots-per-day=4`, `--anchor=YYYY-MM-DD`,
`--database-url=...`, `--yes` (allow more than 20M snapshot rows), `--skip-rebuild`, `--no-checksum`.
It prints an estimate before inserting and row counts, table sizes and checksums at the end.
See the scale tiers in METHODOLOGY.md; 100k users needs reduced history.

## Mock platform server

| Env | Default | Meaning |
|---|---|---|
| `MOCK_PORT` | 4100 | listen port |
| `MOCK_LATENCY_MS` | 0 | fixed delay per request |
| `MOCK_JITTER_MS` | 0 | +/- uniform jitter added to the delay |
| `MOCK_ERROR_RATE` | 0 | fraction of requests answered with HTTP 500 (seeded PRNG, `MOCK_SEED`) |

Endpoints: `POST /graphql`, `GET /api/user.info?handles=`, `GET /users/:username`, `GET /__health`,
`GET /__stats`. Usernames starting `nouser_` are "not found". Data is a pure function of the username.

## Reset

```bash
npm run db:reset   # drops the volume and recreates an empty DB, then re-run steps 2 and 5
```

## Measuring (Step 0.3)

Prerequisites: everything above, k6 (`brew install k6`), and for M18 `cd benchmarks && npm install --save-dev lighthouse`
(not installed automatically) plus Google Chrome.

```bash
./run-all.sh baseline 1000          # reseeds, runs everything, writes results/baseline/1000/summary.md
QUICK=1 ./run-all.sh smoke 1000     # fast pipeline check, numbers not reportable
```

Knobs: `ANCHOR=YYYY-MM-DD`, `SEED_ARGS="--days=30 --snapshots-per-day=1 --yes"` (for 100k), `WARMUP_S`, `DURATION_S`,
`COLD_DURATION_S`, `G500_DURATION_S`, `SYNC_SAMPLE` / `SYNC_FULL=1`, `SKIP_LIGHTHOUSE=1`, `FORCE=1` (overwrite a results dir).
Results are plain files under `results/<label>/<users>/`: `summary.md`, `machine.txt`, `k6/*.json`, `explain/`, `sql/`, `logs/`, `rss.csv`, ...

Individual pieces (API must be running via `scripts/api.sh start` and the mock via `npm run mock`):

| Command | Metric |
|---|---|
| `npx tsx scripts/make-fixtures.ts` then `k6 run -e CACHE=miss k6/m1-leaderboard-global.js` | M1-M6, M9, M14 (see header comments for env) |
| `npx tsx scripts/explain.ts out/` / `--pgss-only` | M7 |
| `npx tsx scripts/time-rebuild.ts out.json` | M8 |
| `npx tsx scripts/time-sync.ts out.json --sample=300` (needs `*_BASE_URL` set to the mock) | M10 |
| `npx tsx scripts/table-sizes.ts out.json` | M12 |
| `scripts/rss-sampler.sh .run/api.pid out.csv` | M13 |
| `npx tsx scripts/rank-consistency.ts out.json` | M15 |
| `./lighthouse.sh <label>` | M18 |
| `JWT_SECRET=bench-secret npx tsx scripts/jwt.ts <userId>` | a Bearer token |

`k6` runs with `MODE=cold` right after `scripts/api.sh restart` for cold numbers. The hooks and rules are in METHODOLOGY.md.
