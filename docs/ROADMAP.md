# UpSprint: Engineering Roadmap

A step-by-step plan to measure, fix, re-architect, and extend UpSprint, with a ready-to-paste Claude Code prompt for each step.

---

## How to use this document

1. **Work one step at a time, one Claude Code session per step.** Every prompt starts with "Read `docs/ROADMAP.md`, Step X.Y", so Claude has the full context without you retyping it. Commit this file first so every session can read it.
2. **Use Plan mode first** (Shift+Tab in Claude Code) for any step marked 🧠. Read the plan, push back, then let it implement.
3. **Every step ends with a commit on its own branch and a PR**, even if you merge it yourself. A clean PR history is part of the interview story.
4. **Never skip the "Done when" checks.** If a check fails, the step isn't done.
5. **Re-run the benchmark suite at the end of each phase** (Phases 2, 3, 4 and 8) and append the results to `docs/BENCHMARKS.md`.

### The golden rule for interview numbers

> Every number you quote must come from a script in this repo that the interviewer could run, on a dataset that a seed script generates, against a git tag they can check out.

This roadmap therefore gives **no predicted numbers**. You produce them in Phase 0 (baseline) and again after each phase (improved). Predicting figures ahead of time is how candidates end up quoting numbers they can't defend.

---

## Phase overview

| Phase | Theme | Main outcome | Interview value |
|---|---|---|---|
| 0 | Baseline measurement | Reproducible benchmark harness plus "before" numbers | The "before" half of your story |
| 1 | Correctness and security | Local tests, auth hardening, bug fixes | Shows engineering discipline |
| 2 | Containerise and decouple | Docker, Redis, BullMQ workers, async account linking | Process separation, queues, resilience |
| 3 | Data model refactor | Read models, time-series tables, multi-platform streaks | CQRS, schema design, partitioning |
| 4 | Leaderboard v2 | Redis sorted sets, incremental updates, caching, SSE | Core latency win: the "after" numbers |
| 5 | UI/UX redesign and landing page | Design system, new backgrounds, every page redesigned, micro-SaaS landing page | Product polish, conversion; Lighthouse numbers |
| 6 | Progress dashboard | Unified analytics page with charts | Real user value |
| 7 | Event-driven platform | Kafka/Redpanda, outbox, badges, notifications, contests | Event-driven architecture |
| 8 | Kubernetes and observability | Helm, HPA, KEDA, Prometheus/Grafana/OTel, SLOs | Horizontal scaling numbers |
| 9 | Growth features | README widget, compare, recommender, college tenancy, challenges | Product thinking |
| 10 | Interview package | BENCHMARKS.md, ADRs, diagrams, resume bullets | Final story |

Rough effort (part-time, with Claude doing the coding): Phase 0: 3–4 days · Phase 1: 4–5 days · Phase 2: 1 week · Phase 3: 1 week · Phase 4: 1–1.5 weeks · Phase 5: 1–1.5 weeks · Phase 6: 1 week · Phase 7: 1.5 weeks · Phase 8: 1 week · Phase 9: pick 2–3 features · Phase 10: 2 days.

**If you're short on time, Phases 0 → 1 → 2 → 4 → 5 → 6 → 10 make a complete, strong story.** Phases 3, 7 and 8 deepen it.

---

# Phase 0: Baseline measurement (do this BEFORE changing anything)

### Why this phase matters
Your interview story is "it was X, I changed the architecture, now it's Y". Without a trustworthy X there is no story. The current code has bottlenecks that grow with data size (for example, platform leaderboards scan the whole snapshot history on every request, and account linking triggers a full leaderboard rebuild), so you must measure at several dataset sizes to show *how it scales*, not just one number.

### Measurement principles (memorise these; interviewers probe them)
- **Same machine, same dataset, same load profile** for before and after. Record CPU model, RAM, OS, Node version and Postgres version in every results file.
- **Deterministic seed data** (fixed RNG seed) at three sizes: **1k, 10k and 100k users**.
- **No real external APIs.** Benchmarks hit a **mock platform server** with configurable latency and error rate. This makes results repeatable and avoids hammering LeetCode or Codeforces.
- **Report percentiles (p50/p95/p99), not averages.** Report throughput (req/s) and error rate alongside them.
- **Warm-up runs are discarded.** Report cold-cache and warm-cache numbers separately, since the current cache has a 60s TTL.
- **DB timings come from `EXPLAIN (ANALYZE, BUFFERS)` and `pg_stat_statements`**, not from guesses.
- **Store raw outputs** (k6 JSON summaries, EXPLAIN text) in `benchmarks/results/<tag>/`. Your summary table must be traceable to them.

### What to measure (baseline metric catalogue)

| ID | Metric | How | Why it matters |
|---|---|---|---|
| M1 | `GET /leaderboard` (global, page 1) p50/p95/p99 and req/s, cold and warm | k6 | Main page |
| M2 | `GET /leaderboard?batch=…&branch=…` | k6 | Filtered path |
| M3 | `GET /leaderboard?platform=codeforces` deep page (page 1 vs page 200) | k6 | OFFSET plus full snapshot scan |
| M4 | `GET /leaderboard/daily-activity` | k6 | Streak board |
| M5 | `GET /leaderboard/user/:id` | k6 | Your-rank lookup |
| M6 | `GET /groups/:id/leaderboard` for groups of 50 and 500 members | k6 | Loads the whole object graph per request |
| M7 | DB execution time plus buffers for the platform-leaderboard SQL | `EXPLAIN ANALYZE` | Proves the scan cost |
| M8 | `rebuildLeaderboard()` duration vs N users | script timing | Full rebuild cost |
| M9 | `POST /users/accounts/connect` latency vs N users (mock platform at 300 ms) | k6 | Synchronous rebuild inside a request |
| M10 | Full sync duration for N accounts (mock at 300 ms latency, 2% errors) | script timing | Sequential ingestion |
| M11 | Data freshness: worst case from a platform change to a leaderboard change | derived from the cron schedule plus measured sync time | Baseline is bounded by the 6h snapshot + daily 01:00 rebuild |
| M12 | `PlatformSnapshot` table size and rows per account per month | `pg_total_relation_size` | Storage growth from storing `rawData` every snapshot |
| M13 | Peak RSS memory of the API process during the load test | `ps` sampling or prom-client | The unbounded in-memory cache |
| M14 | Behaviour under concurrent connects (10 concurrent `connect` calls) | k6 | Concurrent full rebuilds racing each other |
| M15 | Rank consistency: % of users whose `/leaderboard/user/:id` rank differs from their position in the list | test script | Correctness bug. "Before: X% inconsistent, after: 0%" |
| M18 | Frontend: Lighthouse performance and accessibility scores, LCP, CLS, TBT and first-load JS size for `/`, `/leaderboard` and `/profile` (mobile preset, production build) | Lighthouse CLI, 3 runs, median; `next build` output | The "before" for the UI redesign |

### Step 0.1: Freeze the baseline

**Do it yourself (no Claude needed):**
```bash
git checkout main && git pull
git tag baseline-v1
git push origin baseline-v1
```
Every "before" number must come from this tag.

### Step 0.2: Benchmark infrastructure 🧠

Creates a separate `benchmarks/` folder. App changes are limited to **three tiny, behaviour-neutral, env-gated hooks** needed for testing. Document them in the methodology. Apply them **on a branch from `baseline-v1`** (named `baseline-v1-bench`), so the baseline code itself is unchanged.

**Prompt:**
```
Read docs/ROADMAP.md, Phase 0, Step 0.2. We are building a benchmark harness to measure the
CURRENT (baseline) performance of this app. Do NOT change any app behaviour.

Create a branch `baseline-v1-bench` from tag `baseline-v1`. Then:

1. Add these minimal env-gated hooks to the backend (defaults must keep current behaviour exactly):
   - DISABLE_CRON=true skips startCronJobs() in backend/src/server.ts.
   - LEETCODE_BASE_URL, CODEFORCES_BASE_URL, CODECHEF_BASE_URL override the hardcoded hosts in
     backend/src/services/*.service.ts (default to the real URLs).
   - Nothing else. List every app-code line you changed in benchmarks/METHODOLOGY.md.

2. benchmarks/docker-compose.bench.yml: Postgres 16 with pg_stat_statements enabled
   (shared_preload_libraries), fixed resource limits (e.g. 2 CPU, 2 GB), port 5433.

3. benchmarks/mock-platforms/: a small Node HTTP server that imitates the three platform
   endpoints the services actually call (LeetCode GraphQL getUserProfile shape,
   Codeforces user.info, the CodeChef HTML fragments the regexes parse). Deterministic data
   per username (hash-based). Configurable via env: MOCK_LATENCY_MS, MOCK_JITTER_MS,
   MOCK_ERROR_RATE. Read the services first so the response shapes match exactly.

4. benchmarks/seed/seed.ts: deterministic seeder (fixed RNG seed) with --users=N.
   Distribution: ~80% users have LeetCode, ~50% Codeforces, ~30% CodeChef;
   10% GROUPS_ONLY; realistic batch/branch spread using VALID_BRANCHES;
   180 days of history: 4 PlatformSnapshots/day per account with a realistic rawData
   payload size (LeetCode rawData should include a submissionCalendar like the real one);
   DailyActivity rows from a random-walk activity model; groups: one of 50 members,
   one of 500, plus many small ones. Use COPY or multi-row INSERTs, as 100k users must
   seed in minutes. After seeding, run rebuildLeaderboard() once so the Leaderboard
   table is populated, and VACUUM ANALYZE.

5. benchmarks/README.md explaining how to start everything.

Ask me before installing anything globally. Show me the plan first.
```

**Done when:** `docker compose -f benchmarks/docker-compose.bench.yml up -d` plus `seed --users=1000` works; the API starts against the bench DB with `DISABLE_CRON=true`; the mock server returns data the existing services parse without errors.

### Step 0.3: Load test and measurement scripts

**Prompt:**
```
Read docs/ROADMAP.md, Phase 0, Step 0.3 and the metric catalogue M1–M18. On branch
baseline-v1-bench, build the measurement scripts in benchmarks/:

1. k6 scripts (benchmarks/k6/) for M1–M6, M9, M14. Each script: 30s warm-up (excluded via
   a separate scenario/tag), then a constant-arrival-rate scenario; output summary JSON
   with p50/p95/p99, req/s and error rate. Include a "cold" variant that runs right after
   an API restart, and a "warm" variant. Auth: generate JWTs for seeded users with the
   same JWT_SECRET (small helper script) and pass them as Bearer tokens. Note: the global
   apiLimiter (60 req/min/IP) will throttle k6, so add a BENCH_DISABLE_RATE_LIMIT=true
   env hook (default off) and document it in METHODOLOGY.md.

2. benchmarks/sql/: EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) for the exact SQL used by
   getPlatformLeaderboard, getLeetCodeLeaderboard, fetchLatestSnapshotsWithAccountUser and
   the Prisma queries behind GET /leaderboard (capture them with Prisma query logging),
   plus pg_stat_statements top-10 by mean time after a k6 run (M7).

3. benchmarks/scripts/: timing scripts for rebuildLeaderboard() (M8) and runAllSnapshots()
   against the mock server (M10); a table-size report (M12); an RSS sampler (M13); a
   rank-consistency checker (M15) that compares /leaderboard/user/:id against the user's
   position in the paged list.

4. benchmarks/lighthouse.sh <label>: builds the frontend for production (`next build && next start`)
   against the seeded API, runs Lighthouse (mobile preset) 3 times on /, /leaderboard and /profile
   (log in via a seeded user's cookie), and saves the JSON reports plus the median scores, LCP,
   CLS, TBT and first-load JS from the `next build` output (M18). Use `npx lighthouse`; ask me
   before installing anything.

5. benchmarks/run-all.sh <label> <users>: reseeds, restarts the API, runs everything and
   writes benchmarks/results/<label>/<users>/ with raw outputs plus a summary.md table.
   It records machine info (CPU model, cores, RAM, OS, node -v, postgres version, git SHA).

Note that for k6 I may need `brew install k6`, so tell me instead of doing it.
```

**Done when:** `./benchmarks/run-all.sh baseline 1000` produces a complete `summary.md`.

### Step 0.4: Run the baseline and record it

**Do it yourself:** run at 1k, 10k and 100k users. Close other apps, plug in power, and run each size **3 times**; report the median run. Then:

**Prompt:**
```
Read docs/ROADMAP.md, Step 0.4. Using benchmarks/results/baseline/*, create docs/BENCHMARKS.md
with: environment table, methodology summary (link METHODOLOGY.md), and one table per metric
M1–M18 with columns 1k / 10k / 100k. Use the median of the 3 runs and link every number to
its raw file. Add a short "Observations" section explaining each bottleneck by pointing at the
code responsible (file:line), e.g. the MAX(createdAt) GROUP BY subquery for M3/M7.
Do not round in a way that changes meaning; keep units explicit (ms, req/s, MB).
Leave an empty "After" column for later phases.
```

Merge `baseline-v1-bench` harness files (not the hooks, which get re-added properly in Phase 1/2) into `main` so later phases can reuse the harness. Simplest approach: merge the whole branch, since the hooks are default-off.

---

# Phase 1: Correctness, security and tests

> No GitHub Actions or hosted CI in this project (see CLAUDE.md). All checks run locally through `npm run check`.

### Step 1.1: Local test infrastructure 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 1.1. Add a test setup to backend/: vitest + supertest, and
Testcontainers (Postgres) for integration tests so tests run against a real DB with
`prisma migrate deploy`. Refactor only what's needed to make app.ts testable (it already
exports app). Add a few smoke tests: auth register/login, GET /leaderboard, connect account
with the platform services mocked. Add an `npm run check` script in backend/ (prisma
generate + tsc --noEmit + lint + test) and in frontend/my-app/ (lint + tsc --noEmit + build).
Do NOT add GitHub Actions or any CI config. Also add
backend/.env.example and frontend/my-app/.env.example (README references them but they
don't exist). Plan first.
```

### Step 1.2: Auth hardening

Problems: the JWT is passed in the OAuth redirect URL (`?token=`), written by client JS into a **non-httpOnly** cookie, returned in JSON bodies, and sent as a Bearer header read from `document.cookie`. The README claims httpOnly-only.

**Prompt:**
```
Read docs/ROADMAP.md, Step 1.2. Harden auth end to end:
- OAuth callback (backend/src/routes/oauth.routes.ts): stop putting the JWT in the redirect
  URL. Use a short-lived one-time code (random, stored server-side with ~60s TTL, single
  use) that the frontend exchanges via POST /auth/exchange, which sets the httpOnly cookie.
  An in-DB table is fine for now; we add Redis in Phase 2.
- Stop returning `token` in register/login JSON bodies.
- Frontend: remove the code in useAuth.tsx that writes document.cookie, and remove the
  Authorization header built from document.cookie in services/api.ts. Rely on the httpOnly
  cookie with credentials: 'include'. Check that cross-site cookie settings (SameSite=None;
  Secure in prod) still work for the deployed setup, and tell me what env/domain setup it needs.
- Add CSRF protection appropriate for cookie auth (double-submit token or Origin check on
  state-changing routes); README claims CSRF protection but none exists.
- Protect /metrics (admin auth or a METRICS_TOKEN) and move it above the error handler.
- Add zod validation for request bodies/queries on all routes.
Write tests for each change. Update README's security section to match reality.
```

### Step 1.3: Data and logic bug fixes

**Prompt:**
```
Read docs/ROADMAP.md, Step 1.3. Fix these bugs, each with a failing test first (TDD):
1. Codeforces snapshots store maxRating as problemsSolved (snapshot.job.ts and
   snapshot.routes.ts). Store null for now, plus maxRating inside rawData; real solved
   count comes in Phase 3.
2. Codeforces handle is not URL-encoded in codeforces.service.ts.
3. Rank inconsistency: Leaderboard.rank includes GROUPS_ONLY users, but list endpoints
   hide them and renumber by index, so /leaderboard/user/:id disagrees with the list.
   Make rank consistent with what the user sees, and use standard competition ranking for
   ties (1,2,2,4) everywhere. Note the filtered-list rank semantics in a comment.
4. utils/cache.ts: overwriting a key leaves the old setTimeout alive and it deletes the new
   value early; the Map is unbounded. Replace with a bounded LRU with TTL (lru-cache),
   keeping the same API. (README already claims LRU.)
5. group.service.ts activity_today uses local setHours while DailyActivity dates are UTC.
6. Group invite codes: Math.random with no collision handling. Use crypto with retry on
   unique violation.
7. Leaving a group as the last ADMIN orphans it: promote the oldest member or delete the
   empty group.
8. JobRun is never written: record start/finish/status/duration for snapshot and
   leaderboard jobs.
9. Snapshot fetchers: add axios timeouts (e.g. 10s) and a proper User-Agent constant.
Run the M15 rank-consistency script afterwards and paste the result.
```

**Done when:** `npm run check` passes locally in both apps and M15 shows 0% inconsistency. Record that in BENCHMARKS.md as your first "after" number; it's a correctness result, not a speed one.

---

# Phase 2: Containerise and decouple

### Step 2.1: Docker and docker-compose

**Prompt:**
```
Read docs/ROADMAP.md, Step 2.1. Add production-grade Dockerfiles:
- backend/Dockerfile: multi-stage (deps → build → runtime), node:22-alpine or distroless,
  non-root user, prisma generate in build, `prisma migrate deploy` as a separate entrypoint
  command, healthcheck hitting a new GET /healthz (liveness) and GET /readyz (DB + Redis ping).
- frontend/my-app/Dockerfile: Next.js standalone output.
- Root docker-compose.yml: postgres, redis, api, worker (same image, different command;
  worker is created in Step 2.2, so stub the service), web. Volumes, healthchecks,
  depends_on with condition: service_healthy.
- .dockerignore files. Update README "Local Setup" to `docker compose up`.
Graceful shutdown: handle SIGTERM in server.ts (stop accepting, drain, close Prisma).
```

### Step 2.2: Worker service and job queue (BullMQ) 🧠

Takes ingestion out of the API process. This fixes duplicate cron jobs when scaled, the sequential for-loop, missing retries, and the full sync on every boot.

**Prompt:**
```
Read docs/ROADMAP.md, Step 2.2. Introduce Redis + BullMQ and a separate worker process.
Design (show me the plan first):
- backend/src/worker.ts: new entrypoint that runs BullMQ workers. API process no longer
  runs node-cron or the startup sync.
- Queues: `sync-account` (one job per linked account), `leaderboard` (rebuild/reconcile).
- Scheduler: BullMQ repeatable jobs (or a single scheduler) that enqueue sync-account jobs
  for all accounts every N hours with jitter; use jobId = accountId:window for dedupe so
  multiple scheduler replicas don't double-enqueue.
- Per-platform rate limiting using BullMQ limiter (separate queues per platform or group
  keys), concurrency configurable via env.
- Retries with exponential backoff + jitter; after max attempts → failed set (our DLQ);
  expose counts in /admin/jobs/summary.
- Circuit breaker per platform (opossum or a small implementation): if a platform's error
  rate spikes, pause that platform's queue for a cool-down.
- Codeforces: batch handles in user.info (up to a safe batch size) via a batching job.
- Keep processAccountSnapshot logic but move it into a platform-adapter interface
  (PlatformAdapter { fetchProfile, toStats }) so adding platforms is easy.
- Redis-backed rate limiting for the API (rate-limit-redis) so limits work across replicas.
- Bull Board (admin-only) for queue visibility.
Add integration tests using the mock-platform server from benchmarks/.
```

### Step 2.3: Async account linking

Today `connect` and `disconnect` run a snapshot **and a full leaderboard rebuild inside the HTTP request** (`user.controller.ts`).

**Prompt:**
```
Read docs/ROADMAP.md, Step 2.3. Make account linking asynchronous:
- POST /users/accounts/connect: validate handle cheaply (single platform lookup with
  timeout), create LinkedAccount with status=PENDING_SYNC, enqueue a high-priority
  sync-account job, return 202 with the account and a status URL.
- Add LinkedAccount.syncStatus (PENDING_SYNC | OK | FAILED) and lastSyncedAt, lastError.
- After a successful sync, update only that user's leaderboard entry (temporary SQL
  upsert + rank recompute is fine; Phase 4 replaces it with Redis ZSETs). No full rebuild
  in the request path, ever.
- disconnect: delete, enqueue leaderboard update, return immediately. Use onDelete:
  Cascade in Prisma instead of manual deleteMany chains.
- Frontend profile page: show a "Syncing…" state and poll the status endpoint (SSE comes
  in Phase 4).
Re-run k6 for M9 and M14 and give me the numbers vs the baseline.
```

### Step 2.4: Observability, part 1

**Prompt:**
```
Read docs/ROADMAP.md, Step 2.4. Replace backend/src/utils/metrics.ts with prom-client:
- http_request_duration_seconds histogram (labels: method, route template, status) via
  middleware; default Node process metrics.
- Job metrics: job duration histogram, completed/failed counters per queue and platform,
  queue depth gauge; external API latency histogram per platform.
- Prisma query duration (Prisma metrics or middleware).
- Structured logging: request-id middleware (X-Request-Id), propagate into logs and jobs;
  switch console.* calls to the logger.
- Add prometheus + grafana to docker-compose with a provisioned dashboard JSON in
  ops/grafana/ (API latency p50/p95/p99 per route, error rate, queue depth, sync success
  rate per platform, data freshness = now - max(lastSyncedAt)).
```

**End of Phase 2:** run `./benchmarks/run-all.sh phase2 <N>` for all sizes. Expect big changes for M9, M10 and M14, and little change for read endpoints, which is fine because Phase 4 targets those. Update BENCHMARKS.md.

---

# Phase 3: Data model refactor (CQRS read models and time series)

### Step 3.1: Read model and time-series tables 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 3.1. Redesign storage for reads (plan first, including the
migration/backfill strategy and rollback):
- PlatformStatsCurrent (1 row per LinkedAccount): rating, maxRating, problemsSolved,
  easy/medium/hard, rankTitle, globalRank, updatedAt. Upserted by the worker on every
  sync. All "latest snapshot" queries switch to this table (kills the
  MAX(createdAt) GROUP BY scan).
- DailyStat(linkedAccountId, date, rating, problemsSolved, easy, medium, hard) unique on
  (linkedAccountId, date): one compact row per day for charts.
- ContestResult(linkedAccountId, platform, contestId, contestName, date, rank, oldRating,
  newRating) unique on (linkedAccountId, contestId). Sources: Codeforces user.rating,
  LeetCode userContestRankingHistory, CodeChef (best-effort).
- TagStat(linkedAccountId, tag, solvedCount) for topic analysis (LeetCode
  tagProblemCounts, Codeforces user.status submissions → problem tags).
- PlatformSnapshot: stop storing the full rawData every sync. Keep only a raw payload hash
  + small payload, or archive raw payloads to a separate table with retention (e.g. 30 days).
- Backfill script from existing PlatformSnapshot rows; idempotent and resumable.
- Add the matching mock responses to benchmarks/mock-platforms.
Update the seeder to also fill the new tables so benchmarks stay comparable.
```

### Step 3.2: Streaks and activity for every platform

**Prompt:**
```
Read docs/ROADMAP.md, Step 3.2. Today DailyActivity/streaks only work for LeetCode.
- Codeforces: derive daily accepted counts from user.status (incremental: only fetch
  submissions newer than our watermark using `from`/`count` paging).
- CodeChef: best-effort from the profile page activity data if available; otherwise mark
  as unsupported and document it.
- Move the streak algorithm into a pure, unit-tested function (timezone-aware: user has a
  timezone field, default UTC; a "day" is in the user's timezone).
- Add a combined "any platform" streak per user (User-level streak = union of active days).
- Daily-activity leaderboard supports platform=all using the combined streak.
```

### Step 3.3: Partitioning and retention

**Prompt:**
```
Read docs/ROADMAP.md, Step 3.3. Add monthly range partitioning on DailyStat (and the raw
archive table) using native Postgres partitioning via a raw SQL Prisma migration, a job that
pre-creates future partitions, and a retention job that drops raw-archive partitions older
than the retention window. Explain in an ADR (docs/adr/) why partitioning vs TimescaleDB.
Show EXPLAIN output demonstrating partition pruning for a 30-day dashboard query.
```

**End of Phase 3:** re-run M3, M7 and M12. M12 (storage per account per month) is a strong, easily justified number.

---

# Phase 4: Leaderboard v2 (the centrepiece)

### Step 4.1: Redis sorted-set serving layer 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 4.1. Build the leaderboard serving layer on Redis sorted sets
(plan first, with the key design and memory estimate for 100k users):
- Keys: lb:{v}:global, lb:{v}:global:batch:{b}, lb:{v}:global:branch:{br},
  lb:{v}:global:batch:{b}:branch:{br}, lb:{v}:platform:{p} (+ same filter combos),
  lb:{v}:streak:{p|all}, lb:{v}:group:{id}:{metric}. {v} is a version for atomic swaps.
- Only GLOBAL_AND_GROUPS users go into global/platform keys; everyone goes into their
  groups' keys.
- Score encoding for deterministic tie-breaks (e.g. primary score + secondary metric
  packed into the double, or a secondary ZSET lookup); document the choice.
- LeaderboardService interface: getPage(key, cursor/page, limit), getRank(key, userId)
  using ZREVRANGE/ZREVRANK/ZCOUNT for competition ranking, getAround(key, userId, k).
- User profile hydration (name, avatar, handles) from a Redis hash with Postgres fallback
  in one batched query, never N+1.
- Keep the Postgres Leaderboard table as the durable copy.
- Feature flag LEADERBOARD_BACKEND=sql|redis so we can benchmark both on the same build.
```

### Step 4.2: Incremental updates and reconciliation

**Prompt:**
```
Read docs/ROADMAP.md, Step 4.2. Make leaderboard updates incremental:
- When the worker detects a user's stats changed (compare with PlatformStatsCurrent),
  recompute that user's global score and ZADD to every key they belong to in one
  MULTI/pipeline. Visibility, batch/branch changes and group join/leave must move the user
  between keys (handle all of these, with tests).
- Nightly reconciliation job: rebuild every key into lb:{v+1}:*, verify counts against
  Postgres, then atomically flip the active version pointer (lb:active = v+1) and expire
  the old version. Zero-downtime, no DELETE-all.
- Emit a metric for drift found during reconciliation (should be ~0).
- Remove the old rebuildLeaderboard DELETE+INSERT path from all request handlers.
Re-measure M8 (now: per-user update time and full reconcile time) and M11 (freshness).
```

### Step 4.3: Endpoints, pagination and groups

**Prompt:**
```
Read docs/ROADMAP.md, Step 4.3. Switch all leaderboard endpoints to LeaderboardService:
GET /leaderboard (all filters, platform), /leaderboard/daily-activity, /leaderboard/user/:id
(+ "around me" window), /groups/:id/leaderboard (all metrics). Keep response shapes
backward compatible with the frontend. Add cursor-based pagination (opaque cursor) while
still accepting page=. Group leaderboards for metrics not stored as ZSETs (e.g.
activity_7d) are computed in a single SQL aggregate query (no object-graph loading) and
cached. Add a frontend "Jump to my rank" button.
```

### Step 4.4: Multi-layer caching

**Prompt:**
```
Read docs/ROADMAP.md, Step 4.4. Add layered caching and document it in an ADR:
- Redis cache-aside for hydrated pages with versioned keys (include lb:active version so
  a version flip invalidates naturally), and stampede protection (single-flight lock or
  probabilistic early expiration).
- HTTP: Cache-Control (public, s-maxage, stale-while-revalidate) + ETag/If-None-Match → 304
  on public leaderboard endpoints; private/no-store on user-specific ones.
- Next.js: landing-page top-N via server component with revalidate; migrate leaderboard
  fetching to TanStack Query (staleTime, keepPreviousData for pagination).
- Remove the in-process cache entirely (it can't be shared across replicas).
Report cache hit ratio as a Prometheus metric.
```

### Step 4.5: Real-time rank updates (SSE)

**Prompt:**
```
Read docs/ROADMAP.md, Step 4.5. When a user's rank changes, publish an event over Redis
pub/sub (channel per leaderboard key family). Add GET /leaderboard/stream (SSE) that
supports multiple API replicas (each replica subscribes to Redis and fans out to its own
connections), sends heartbeats, and supports Last-Event-ID. Frontend: live-update visible
rows with an animation and a toast like "Alex just overtook you". Also use it for the
account sync status from Step 2.3 (replace polling). Load-test: number of concurrent SSE
connections one API instance holds while keeping p95 of normal requests within SLO.
```

### Step 4.6: The "after" benchmark

**Do it yourself, then prompt:**
```bash
./benchmarks/run-all.sh phase4 1000 && ./benchmarks/run-all.sh phase4 10000 && ./benchmarks/run-all.sh phase4 100000
```
```
Read docs/ROADMAP.md, Step 4.6. Fill the "After" columns of docs/BENCHMARKS.md from
benchmarks/results/phase4/* (median of 3 runs). For M1–M6 also run with
LEADERBOARD_BACKEND=sql on the same build so we have an apples-to-apples comparison that
isolates the data-structure change from the other changes. Add a "Why it improved" note per
metric, tied to a specific commit/PR. Add a chart (mermaid xychart or a PNG generated from
the raw JSON) of p95 vs dataset size, before vs after. Flag any metric that got WORSE and
explain it honestly.
```

---

# Phase 5: UI/UX redesign and micro-SaaS landing page

### Goal
Make UpSprint look and feel like a premium, modern product that people sign up for and share. Two outcomes:
1. **A coherent design system** applied across every page: modern, sleek and premium.
2. **A landing page that sells UpSprint as a micro-SaaS** to students, study groups and coding clubs. No pricing yet; the goal is sign-ups.

### Rules for this phase (also in CLAUDE.md)
- **Keep the Aceternity components** in `frontend/my-app/src/components/ui/`: `comet-card`, `cover`, `infinite-moving-cards` and `sparkles`. Restyle them through props, classes and tokens; don't rewrite or delete them. Everything else is open to redesign, **including `AuroraBackground` and every page background**.
- **Truthful marketing.** The current landing page has invented testimonials ("Software Engineer at Google", "CS Student, Stanford"). Remove them. Use real quotes from real users (with permission) or leave the section out. Show only real stats, pulled live from the API. Mark unbuilt features "Coming soon". Use platform names only, with no logos that imply partnership.
- **Measure before and after** with M18 (Lighthouse and bundle size). The Phase 0 baseline already covers it.
- If Claude Code has a frontend-design skill available (e.g. `frontend-design`, `high-end-visual-design`, `ui-ux-pro-max`), ask it to use one.

### Step 5.1: Design direction and design system 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Phase 5, Step 5.1 and CLAUDE.md (frontend rules). Audit the current
frontend (frontend/my-app/src): list every page, component, color, font, spacing and
animation in use, and what feels inconsistent or dated. Then propose 2–3 distinct visual
directions for a modern, sleek, premium developer-focused SaaS (e.g. "midnight glass",
"editorial monochrome + one accent", "terminal-luxe"). For each: palette, typography pairing
(e.g. a geometric sans + a mono for numbers/handles), background treatment, card style,
motion personality, and how the Aceternity components (comet-card, cover,
infinite-moving-cards, sparkles in src/components/ui/) fit in. Wait for me to pick one.

After I pick: implement the design system only (no page redesigns yet):
- Design tokens in Tailwind v4 `@theme` in src/styles/globals.css: color scales and semantic
  tokens (bg, surface, border, text, muted, accent, success, warning, danger), radius,
  shadow/glow, spacing, type scale, motion durations/easings. Dark-first with a light theme
  (class strategy + system preference + a toggle that persists).
- Fonts via next/font.
- Replace AuroraBackground with a new background system (e.g. layered radial gradients,
  subtle grid/dot pattern with a fade mask, grain/noise, a slow-moving spotlight). Must be
  GPU-cheap, honour prefers-reduced-motion, and be variant-based (hero, app, minimal).
- Core primitives (Button, Card, Badge, Input, Select, Tabs, Tooltip, Dialog, Skeleton,
  Avatar, EmptyState) in src/components/ui/ next to the Aceternity ones. Prefer shadcn/ui
  (Radix) since ui/input and ui/label already follow it; ask before adding dependencies.
- A /design route (dev-only) that renders every token and primitive for visual QA.
```

### Step 5.2: App shell and navigation

**Prompt:**
```
Read docs/ROADMAP.md, Step 5.2. Using the Step 5.1 design system, redesign the app shell:
- Navbar: sticky, translucent with backdrop blur, active-route indicator, user menu with
  avatar, theme toggle, mobile drawer. Separate marketing navbar (logged out) vs app navbar
  (logged in).
- A command palette (Cmd/Ctrl+K) to jump to pages, search users by name/handle, switch
  leaderboard filters. Ask before adding `cmdk`.
- Footer for marketing pages.
- Page transitions in src/app/template.tsx: subtle, fast, reduced-motion aware.
- Toasts and loading states (BrandedLoader, Skeleton) restyled to the new system.
Test at 375px, 768px and 1280px widths in light and dark.
```

### Step 5.3: Landing page as a micro-SaaS 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 5.3 and CLAUDE.md (marketing rules: truthful, no pricing). Redesign
frontend/my-app/src/app/page.tsx into a conversion-focused landing page that sells UpSprint
as a product. First propose the section list and copy, wait for my review, then build.
Suggested structure:
1. Hero: one-line value proposition (e.g. "All your competitive programming progress. One
   place. One leaderboard."), sub-headline naming LeetCode, Codeforces and CodeChef,
   primary CTA "Get started free with Google", secondary CTA "View live leaderboard".
   Product visual: an animated, realistic mock of the dashboard/leaderboard UI built in
   code (not a screenshot), using the new background "hero" variant. Use `cover` for the
   emphasised word and `sparkles` sparingly.
2. Live proof bar: real numbers from a new public cached endpoint GET /stats/public
   (users, linked accounts, problems tracked, active streaks). Hide a number if it is too
   small to be impressive rather than faking it.
3. Problem → solution: "Your progress is scattered across three sites" vs the unified view.
4. How it works: 3 steps (Sign in → Link handles → Track, compete, improve).
5. Feature showcase: alternating rows or a bento grid built with comet-card. Unified
   profile, multi-dimensional leaderboards, streaks, private groups, privacy controls,
   progress dashboard, contest reminders. Mark unshipped ones "Coming soon".
6. Use cases: students and placement prep, study groups and friends, college coding clubs
   ("Bring UpSprint to your college" → a contact/interest form that stores leads in a
   new table).
7. Live leaderboard preview: top 5 from the real API, animated.
8. Social proof: infinite-moving-cards with REAL testimonials only (a data file I fill in);
   if empty, show the live leaderboard ticker instead. Delete the existing fake testimonials.
9. FAQ (accordion): is it free, which platforms, how often data syncs, privacy/visibility,
   is my data safe, can I delete my account.
10. Final CTA band, then footer.
No pricing section. Also: per-page metadata, Open Graph/Twitter images (next/og), favicon set,
sitemap.xml, robots.txt, JSON-LD (SoftwareApplication), semantic headings. The landing page
should be a server component where possible, with client islands for animations, so it
stays fast. Report Lighthouse (M18) for / before and after.
```

### Step 5.4: Auth and onboarding

**Prompt:**
```
Read docs/ROADMAP.md, Step 5.4. Redesign /login and /signup (split layout: form +
product visual, Google button first, clear errors). Add a first-run onboarding flow after
the first login: (1) profile basics (name, batch, branch), (2) link platforms with live
handle validation and a "syncing" state, (3) join or create a group, or skip, (4) land on
the dashboard. Progress indicator, skippable steps, resumable. Track completion so returning
users skip it. Add an empty state everywhere data can be missing.
```

### Step 5.5: Core app pages

**Prompt:**
```
Read docs/ROADMAP.md, Step 5.5. Redesign the in-app pages with the design system, keeping
all existing functionality and API calls:
- /leaderboard: podium for the top 3, a clean data table (sticky header, tabular numbers,
  rank-change arrows, platform badges, streak flame), filters as chips/segmented controls,
  "jump to my rank" row pinned at the bottom, card layout on mobile, skeleton loading,
  keyboard-navigable.
- /profile and /user/[id]: hero card with avatar, handles and badges; platform cards
  (PlatformCard, ProfileCard restyled); activity timeline; settings sections (visibility,
  linked accounts) with clear destructive-action confirmations.
- Groups: GroupDetails and GroupManagementModal redesigned; invite code copy/share with a
  link, member list with roles.
Use comet-card where a premium highlight helps (e.g. the user's own rank card). Don't
change backend behaviour in this step.
```

### Step 5.6: Polish, accessibility and performance

**Prompt:**
```
Read docs/ROADMAP.md, Step 5.6. Do a quality pass over the whole frontend:
- Accessibility: axe checks on every page, keyboard-only walkthrough, focus rings, aria
  labels, WCAG AA contrast in both themes, reduced-motion behaviour.
- Performance: lazy-load tsparticles/sparkles and other heavy effects, next/image
  everywhere, font subsetting, remove unused deps, check first-load JS per route, avoid
  layout shift from animations.
- Visual QA at 375/768/1280/1440 in light and dark; fix overflow and spacing issues.
- Microcopy: consistent tone, helpful errors, no lorem ipsum.
Then run benchmarks/lighthouse.sh phase5 and add the M18 "after" column to BENCHMARKS.md,
comparing with baseline. Report anything that got worse.
```

**Done when:** every page uses the design system, the Aceternity components are still in place, the landing page has no invented content, and M18 shows before/after numbers.

---

# Phase 6: Unified progress dashboard

### Step 6.1: Analytics API

**Prompt:**
```
Read docs/ROADMAP.md, Step 6.1. Build GET /users/:id/progress (self, or others subject to
visibility) returning, for a range (30d/90d/1y/all):
- combined heatmap (date → per-platform counts),
- rating series per platform with contest markers (ContestResult),
- solved totals and easy/medium/hard over time (DailyStat),
- topic strengths/weaknesses (TagStat, normalized),
- current/longest streaks per platform + combined,
- week-over-week and month-over-month deltas, percentile among all users / batch.
Single round trip, aggregated in SQL (no N+1), cached in Redis per user+range,
invalidated when that user's stats change. Add response-time budget test (p95 target goes
in BENCHMARKS.md as M16).
```

### Step 6.2: Dashboard page

**Prompt:**
```
Read docs/ROADMAP.md, Step 6.2. Create /dashboard (and public /user/[id] reuses it) in the
Next.js app using Recharts (or visx) and TanStack Query: KPI tiles (total solved, best
ratings, streaks, percentile), combined calendar heatmap, rating line chart with contest
dots and tooltips, difficulty stacked area, topic radar, range selector, loading skeletons,
empty states for unlinked platforms, mobile layout, light/dark. Use the Phase 5 design
system tokens and primitives; chart colors come from the tokens so both themes work. Ask me
before adding big dependencies.
```

### Step 6.3: Goals

**Prompt:**
```
Read docs/ROADMAP.md, Step 6.3. Add Goals: a user sets daily/weekly targets (problems
solved, by difficulty, per platform or any). Progress is computed from DailyStat/
DailyActivity and shown on the dashboard. Add "streak freeze" (1 per week) that preserves
the combined streak on a missed day. Tests for the timezone edge cases.
```

---

# Phase 7: Event-driven platform

Introduce Kafka only now, when there are **several independent consumers**. That's your answer to "why Kafka?". Use **Redpanda** locally (Kafka API, single binary, light on resources).

### Step 7.1: Event backbone and transactional outbox 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 7.1. Add an event backbone (plan first, write an ADR comparing
BullMQ-only vs Kafka/Redpanda and explaining why we now need a log):
- Redpanda in docker-compose; kafkajs client; topics: stats.changed, contest.finished,
  rank.changed, account.linked, user.activity (partition key = userId for per-user ordering).
- Event schemas versioned (zod or JSON Schema in a shared package), with eventId, type,
  version, occurredAt, userId, payload.
- Transactional outbox: worker writes domain changes + an Outbox row in the same DB
  transaction; a relay publishes to Kafka and marks rows sent (at-least-once). Consumers
  are idempotent (processed-event table keyed by eventId).
- Move leaderboard incremental updates (Step 4.2) into a `leaderboard-updater` consumer
  group so it can be replayed to rebuild Redis from the log.
- Consumer lag metrics in Prometheus/Grafana.
Show the replay procedure: reset the consumer group offset and rebuild the leaderboard;
measure how long a full replay takes at 100k users.
```

### Step 7.2: Badges and achievements consumer

**Prompt:**
```
Read docs/ROADMAP.md, Step 7.2. Add a badge engine as a Kafka consumer. Badges are
data-driven rules (e.g. 7/30/100-day streak, first contest, +100 rating in a month,
100/500 solved, solved on all three platforms in one day, top 10 in batch). Tables Badge
and UserBadge (a previous migration created and dropped them; recreate cleanly). Idempotent
awarding, backfill command, emits badge.awarded. Show badges on profile and dashboard.
```

### Step 7.3: Contest calendar and notifications

**Prompt:**
```
Read docs/ROADMAP.md, Step 7.3. Build:
- Contest calendar: a scheduled job pulls upcoming contests (Codeforces contest.list;
  LeetCode weekly/biweekly schedule; CodeChef contests API/page) into a Contest table;
  GET /contests with filters; a calendar UI page with "add to Google Calendar"/.ics export.
- notification-service consumer: subscribes to badge.awarded, rank.changed (only
  meaningful changes, e.g. overtaken by a group member or entering top N), contest
  reminders (1h before, for platforms the user linked), contest.finished (rating change).
- Channels: in-app notification center (table + bell icon + SSE), email (Resend/SES,
  templated), optional web push. User preferences per channel/type, quiet hours,
  per-user rate limit + digesting to avoid spam.
```

### Step 7.4: Weekly digest

**Prompt:**
```
Read docs/ROADMAP.md, Step 7.4. Weekly digest email per user (opt-in): problems solved
vs last week, streak, rank movement in global/batch/groups, rating changes, upcoming
contests, a suggested focus topic. Generated by a scheduled job that fans out per-user
jobs (BullMQ), idempotent per user+week, with a preview endpoint for admins.
```

---

# Phase 8: Kubernetes, scaling and SLOs

### Step 8.1: Helm chart and local cluster 🧠

**Prompt:**
```
Read docs/ROADMAP.md, Step 8.1. Create deploy/helm/upsprint with: api Deployment +
Service + HPA (CPU and custom metric: request rate), worker Deployment scaled by KEDA on
BullMQ queue depth and Kafka consumer lag, consumers as separate Deployments, a
reconciliation CronJob, a migration Job (helm pre-upgrade hook), ConfigMaps/Secrets,
readiness/liveness probes using /readyz and /healthz, resource requests/limits,
PodDisruptionBudgets, an Ingress. Use Bitnami/official charts for Postgres, Redis and
Redpanda in dev. Provide a Makefile target to spin it up on kind and a doc
deploy/README.md. Do not deploy anywhere remote.
```

### Step 8.2: Tracing, SLOs and scaling test

**Prompt:**
```
Read docs/ROADMAP.md, Step 8.2. Add OpenTelemetry tracing (HTTP, Prisma, Redis, BullMQ,
kafkajs) exported to Jaeger or Tempo, with trace context propagated through jobs and Kafka
headers. Define SLOs in docs/SLO.md: leaderboard read p95, dashboard p95, availability,
data freshness (95% of accounts synced within 1h), and Prometheus alert rules for burn
rate. Then run a horizontal scaling test on kind: k6 ramp against api with 1, 2 and 4 replicas;
record max sustainable req/s at the p95 SLO for each in BENCHMARKS.md (M17). Note: kind on a
laptop shares CPU; document this limitation honestly.
```

---

# Phase 9: Growth features (pick 2–3)

| Feature | Prompt |
|---|---|
| **README / profile card widget** | `Read docs/ROADMAP.md, Phase 9. Add GET /cards/:handle.svg: an SVG stats card (themes, platform toggles) for GitHub READMEs. Aggressive caching (Redis + Cache-Control s-maxage + ETag), rate limited, privacy respects visibility. Add a "Copy embed code" UI on the profile.` |
| **Head-to-head compare** | `Read docs/ROADMAP.md, Phase 9. Add /compare?u=a&u=b: side-by-side ratings, solved, topics, streaks, overlaid rating chart, shared contests with rank diff. Reuse the progress API; one batched request.` |
| **Weak-topic recommender** | `Read docs/ROADMAP.md, Phase 9. Build a recommender: from TagStat find weakest tags relative to the user's level; pull the Codeforces problemset (cached daily) and recommend unsolved problems at rating +0..+200 in those tags; explain each recommendation; track "solved after recommendation" as a quality metric.` |
| **Group challenges** | `Read docs/ROADMAP.md, Phase 9. Time-boxed group challenges: an admin sets metric, start/end, and optional difficulty filter; a live challenge leaderboard (Redis ZSET with TTL); final standings frozen into Postgres at end; badge for winner; notifications at start and end.` |
| **College multi-tenancy** | `Read docs/ROADMAP.md, Phase 9. Add Organization (college) tenancy: org admins, verified email domains, org-scoped leaderboards and dashboards, row-level isolation (Postgres RLS or enforced tenant scoping in the service layer, explain choice in an ADR), org admin analytics page.` |
| **Admin ops page** | `Read docs/ROADMAP.md, Phase 9. Admin page: sync freshness per platform, failure rates, DLQ with retry button, JobRun history, consumer lag, reconciliation drift.` |

---

# Phase 10: Interview package

### Step 10.1: Docs and diagrams

**Prompt:**
```
Read docs/ROADMAP.md, Step 10.1. Produce: docs/ARCHITECTURE.md with before/after
architecture diagrams (mermaid), a request-flow sequence diagram for a leaderboard read and
for an account sync, the data model ERD, and an index of ADRs in docs/adr/. Update README
with an architecture section, a link to BENCHMARKS.md and a short "Engineering highlights"
list. Every claim in README must be true in the code; check each one.
```

### Step 10.2: The interview story

**Prompt:**
```
Read docs/ROADMAP.md, Step 10.2 and docs/BENCHMARKS.md. Write docs/INTERVIEW_NOTES.md:
- a 2-minute STAR narrative (Situation: original architecture + measured baseline;
  Task; Actions: the 4–5 key architectural changes with why; Result: measured numbers),
- 4–6 resume bullets that each contain one real number from BENCHMARKS.md with its
  dataset size (e.g. "at 100k users"),
- likely follow-up questions with answers: why Redis ZSET vs SQL window functions, why
  Kafka, consistency between Postgres and Redis, what happens if Redis dies, how you
  measured, what you'd do at 10M users, trade-offs you rejected,
- a "limitations" section (laptop benchmarks, mock platforms, etc.).
Use ONLY numbers present in BENCHMARKS.md. If a number is missing, write [MEASURE] instead.
```

### Resume bullet template (fill only with measured numbers)
- Re-architected the leaderboard from per-request SQL aggregation to Redis sorted sets with incremental event-driven updates, cutting p95 latency from **[M1 before] ms to [M1 after] ms at 100k users** and per-user rank lookup to O(log N).
- Moved platform ingestion from an in-process sequential cron to a horizontally scalable BullMQ worker tier with per-platform rate limiting, retries and circuit breakers, reducing full-sync time for **[N] accounts from [M10 before] to [M10 after]**.
- Removed a synchronous full-leaderboard rebuild from the account-linking path, reducing its p95 from **[M9 before] to [M9 after]** and eliminating rebuild races under concurrency.
- Redesigned storage with CQRS read models and partitioned time-series tables, reducing storage per account by **[M12 %]** and enabling a unified progress dashboard served at **p95 [M16] ms**.
- Built an event-driven backbone (Kafka with a transactional outbox) feeding leaderboard, badge and notification consumers, with replayable rebuilds of all read models.

---

## Appendix A: Bug and risk tracker

| # | Issue | Where | Fixed in |
|---|---|---|---|
| B1 | Full leaderboard rebuild inside connect/disconnect requests | `controllers/user.controller.ts` | 2.3 |
| B2 | Platform boards scan the whole snapshot history per request | `services/leaderboard.service.ts` | 3.1 / 4.1 |
| B3 | OFFSET pagination | leaderboard service and routes | 4.3 |
| B4 | Up to ~24h staleness (6h sync + daily rebuild) | `jobs/scheduler.ts` | 4.2 |
| B5 | In-memory cache: timer race, unbounded, per-process | `utils/cache.ts` | 1.3 / 4.4 |
| B6 | Profile rank disagrees with list rank; no tie handling | `routes/leaderboard.routes.ts`, `jobs/leaderboard.job.ts` | 1.3 |
| B7 | Group board loads the full object graph per request; UTC/local mix | `services/group.service.ts` | 1.3 / 4.3 |
| B8 | Sequential sync, no timeout/retry/backoff; full sync on every boot | `jobs/snapshot.job.ts`, `jobs/scheduler.ts` | 1.3 / 2.2 |
| B9 | Codeforces `problemsSolved = maxRating`; handle not URL-encoded | `jobs/snapshot.job.ts`, `services/codeforces.service.ts` | 1.3 |
| B10 | Streaks only for LeetCode | `jobs/snapshot.job.ts` | 3.2 |
| B11 | Cron inside the API process (duplicate jobs when scaled) | `server.ts` | 2.2 |
| B12 | JWT in redirect URL; JS-set non-httpOnly cookie; token in JSON | `routes/oauth.routes.ts`, `hooks/useAuth.tsx`, `services/api.ts` | 1.2 |
| B13 | No CSRF protection despite the README claim | backend | 1.2 |
| B14 | `/metrics` public; `JobRun` never written | `app.ts`, jobs | 1.2 / 1.3 |
| B15 | Group code collisions; orphaned group when the last admin leaves | `services/group.service.ts` | 1.3 |
| B16 | `rawData` stored on every snapshot (storage growth) | `jobs/snapshot.job.ts` | 3.1 |
| B17 | No tests, no Docker, no `.env.example` | repo | 1.1 / 2.1 |
| B19 | Landing page shows invented testimonials attributed to "Google" and "Stanford" people (misleading for a real product) | `frontend/my-app/src/app/page.tsx` | 5.3 |
| B18 | In-memory rate limiter (per-process) | `middleware/rateLimit.middleware.ts` | 2.2 |

## Appendix B: Tips for working with Claude Code on this roadmap

- `CLAUDE.md` at the repo root is loaded automatically in every session. It holds the git rules (no Claude attribution, no pushing without permission), the no-CI rule, the benchmark-integrity rules and the frontend rules. Keep it up to date when you change conventions.
- Attribution is also switched off in `.claude/settings.json`. As a safety net, enable the commit-msg hook once per clone; it strips any Claude co-author or "Generated with" lines from commit messages: `git config core.hooksPath scripts/git-hooks`.

- Start each session with the step's prompt as written. If Claude drifts into a later step, say "stay within Step X.Y".
- For 🧠 steps, use Plan mode and ask "what are the trade-offs and what would you not do?" before approving.
- After each step, ask: "Run the tests and type-check, then summarise what changed and anything left unverified."
- Use `/code-review` on the branch before merging.
- If a benchmark number looks surprisingly good, ask Claude to verify the measurement: "Check this k6 run isn't hitting a cache, an error path, or the rate limiter." Error responses are fast and inflate throughput.
- Keep `docs/BENCHMARKS.md` as the single source of truth. Never type a number into the README or your resume that isn't in it.
