# UpSprint benchmarks

Harness for measuring the **baseline** app (`baseline-v1`). Read [METHODOLOGY.md](METHODOLOGY.md) first:
it lists the four app-code hooks and the rules for comparable numbers.

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
