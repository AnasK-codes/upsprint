#!/usr/bin/env bash
# Runs the whole baseline measurement for one dataset size and writes benchmarks/results/<label>/<users>/.
#   benchmarks/run-all.sh <label> <users>
# Reseeds the bench DB (destructive for the bench DB only), restarts the API between phases, runs every script and
# builds summary.md. Order matters: read-only phases first, mutating ones (M9, M14, M10) last.
# Env knobs: ANCHOR=YYYY-MM-DD (default today UTC)  SEED_ARGS="--days=30 --snapshots-per-day=1 --yes"
#   WARMUP_S=30  DURATION_S=60  COLD_DURATION_S=30  G500_DURATION_S=120  SYNC_SAMPLE=300  SYNC_FULL=1
#   SKIP_LIGHTHOUSE=1  QUICK=1 (smoke test: short phases, tiny sync sample, no lighthouse; NOT for reporting)
#   FORCE=1 (overwrite an existing results dir)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="${1:?usage: run-all.sh <label> <users>}"; USERS="${2:?usage: run-all.sh <label> <users>}"
OUT="$HERE/results/$LABEL/$USERS"
if [ -e "$OUT" ] && [ -z "${FORCE:-}" ]; then echo "$OUT exists (FORCE=1 to overwrite)" >&2; exit 1; fi
rm -rf "$OUT"; mkdir -p "$OUT"/{logs,k6,explain,sql}
export BENCH_RUN_DIR="$HERE/.run"; mkdir -p "$BENCH_RUN_DIR"
export API_LOG="$OUT/logs/api.log"
ANCHOR="${ANCHOR:-$(date -u +%Y-%m-%d)}"
WARMUP_S="${WARMUP_S:-30}"; DURATION_S="${DURATION_S:-60}"; COLD_DURATION_S="${COLD_DURATION_S:-30}"; G500_DURATION_S="${G500_DURATION_S:-120}"
SYNC_SAMPLE="${SYNC_SAMPLE:-300}"
if [ -n "${QUICK:-}" ]; then WARMUP_S=3; DURATION_S=8; COLD_DURATION_S=8; G500_DURATION_S=15; SYNC_SAMPLE=15; SKIP_LIGHTHOUSE=1; fi
export DATABASE_URL="postgresql://bench:bench@localhost:5433/upsprint_bench"
export JWT_SECRET="${JWT_SECRET:-bench-secret}"
EVENTS="$OUT/events.log"
ev() { echo "$(date +%s) $*" | tee -a "$EVENTS" >&2; }
cd "$HERE"

psqlb() { docker exec upsprint-bench-db psql -U bench -d upsprint_bench -tA -c "$1"; }
api_ok() { curl -sf "http://localhost:4000/leaderboard/ping" >/dev/null 2>&1; }
api_restart() { "$HERE/scripts/api.sh" restart || ev "ERROR api restart failed"; }
mock_stop() { [ -f "$BENCH_RUN_DIR/mock.pid" ] && kill "$(cat "$BENCH_RUN_DIR/mock.pid")" 2>/dev/null; rm -f "$BENCH_RUN_DIR/mock.pid"; pkill -f "mock-platforms/server.mjs" 2>/dev/null; sleep 0.3; true; }
mock_start() { # latency_ms error_rate
  mock_stop
  MOCK_LATENCY_MS="$1" MOCK_ERROR_RATE="$2" nohup node "$HERE/mock-platforms/server.mjs" >>"$OUT/logs/mock.log" 2>&1 &
  echo $! >"$BENCH_RUN_DIR/mock.pid"; disown
  for _ in $(seq 1 50); do curl -sf localhost:4100/__health >/dev/null && return 0; sleep 0.2; done
  ev "ERROR mock did not start"
}

# ---- k6 wrapper: k6run <name> <script> [ENV=VAL ...]; flags a crashed API instead of silently continuing
k6run() {
  local name="$1" script="$2"; shift 2
  ev "START k6 $name"
  env "$@" OUT_DIR="$OUT/k6" k6 run -q "$HERE/k6/$script" >"$OUT/logs/k6-$name.log" 2>&1
  local rc=$?
  grep -v "unknown fields" "$OUT/logs/k6-$name.log" | grep -E "^m[0-9]+-" || true
  [ $rc -ne 0 ] && ev "WARN k6 $name exit=$rc"
  if ! api_ok; then ev "API_CRASHED during/after $name (see logs/api.log); restarting"; api_restart; fi
  ev "END k6 $name"
}

# ---------------------------------------------------------------- 0. preflight + machine info
docker info >/dev/null 2>&1 || { echo "Docker is not running (macOS: colima start --cpu 4 --memory 6)" >&2; exit 1; }
command -v k6 >/dev/null || { echo "k6 not installed: brew install k6" >&2; exit 1; }
[ -d "$HERE/node_modules" ] || { echo "run: cd benchmarks && npm install" >&2; exit 1; }
{
  echo "label: $LABEL"; echo "users: $USERS"; echo "date_utc: $(date -u +%FT%TZ)"
  echo "cpu_model: $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
  echo "cpu_cores_logical: $(sysctl -n hw.ncpu 2>/dev/null)"; echo "cpu_cores_physical: $(sysctl -n hw.physicalcpu 2>/dev/null)"
  echo "ram_gb: $(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1073741824 ))"
  echo "os: $(sw_vers -productName 2>/dev/null) $(sw_vers -productVersion 2>/dev/null) (Darwin $(uname -r))"
  echo "node: $(node -v)"; echo "k6: $(k6 version | head -1)"
  echo "postgres: $(psqlb 'select version()' 2>/dev/null || echo 'db not up yet')"
  echo "docker_vm: $(docker info --format 'cpus={{.NCPU}} mem_bytes={{.MemTotal}}' 2>/dev/null)"
  echo "postgres_container_limits: $(docker inspect upsprint-bench-db --format 'nano_cpus={{.HostConfig.NanoCpus}} memory={{.HostConfig.Memory}}' 2>/dev/null)"
  echo "power: $(pmset -g batt 2>/dev/null | head -2 | tr '\n' ' ')"
  echo "git_sha: $(git -C "$HERE/.." rev-parse HEAD)"; echo "git_branch: $(git -C "$HERE/.." rev-parse --abbrev-ref HEAD)"
  echo "baseline_v1_sha: $(git -C "$HERE/.." rev-parse baseline-v1 2>/dev/null)"
  echo "git_dirty_files: $(git -C "$HERE/.." status --porcelain -- backend benchmarks frontend | grep -v '^??' | wc -l | tr -d ' ')"
  echo "seed_anchor: $ANCHOR"; echo "seed_args: ${SEED_ARGS:-}"
  echo "knobs: WARMUP_S=$WARMUP_S DURATION_S=$DURATION_S COLD_DURATION_S=$COLD_DURATION_S G500_DURATION_S=$G500_DURATION_S SYNC_SAMPLE=$SYNC_SAMPLE SYNC_FULL=${SYNC_FULL:-} QUICK=${QUICK:-}"
} >"$OUT/machine.txt"
ev "run-all $LABEL $USERS (anchor $ANCHOR)"

# ---------------------------------------------------------------- 1. infra, build, seed
npm run -s db:up >>"$OUT/logs/infra.log" 2>&1 || { ev "ERROR db:up failed"; exit 1; }
npm run -s db:migrate >>"$OUT/logs/infra.log" 2>&1 || { ev "ERROR migrate failed"; exit 1; }
(cd "$HERE/../backend" && npm run -s build) >>"$OUT/logs/infra.log" 2>&1 || { ev "ERROR backend build failed"; exit 1; }
{ echo "postgres: $(psqlb 'select version()')"; } >>"$OUT/machine.txt"
ev "seeding"
npx tsx seed/seed.ts --users="$USERS" --anchor="$ANCHOR" ${SEED_ARGS:-} >"$OUT/logs/seed.log" 2>&1 || { ev "ERROR seed failed (see logs/seed.log)"; exit 1; }
grep -E "checksum|estimate|done" "$OUT/logs/seed.log" >"$OUT/seed-info.txt"
npx tsx scripts/make-fixtures.ts >"$OUT/logs/fixtures.log" 2>&1 || { ev "ERROR fixtures failed"; exit 1; }
cat "$OUT/logs/fixtures.log" >&2
scripts/capture-prisma-sql.sh >"$OUT/logs/capture.log" 2>&1 && cp "$HERE/sql/captured/prisma-queries.log" "$OUT/sql/prisma-queries.log" || ev "WARN prisma query capture failed"

# ---------------------------------------------------------------- 2. read-only phases (M1-M6, M7, M13, M15)
scripts/rss-sampler.sh "$BENCH_RUN_DIR/api.pid" "$OUT/rss.csv" 1 & RSS_PID=$!; disown
cleanup() { kill "$RSS_PID" 2>/dev/null; "$HERE/scripts/api.sh" stop; mock_stop; }
trap cleanup EXIT
psqlb "select pg_stat_statements_reset()" >/dev/null
ev "PHASE read-start"

# cold: fresh API process (empty in-memory cache, new pool/JIT) right before each script. Postgres buffer cache is NOT dropped.
for v in "m1-global|m1-leaderboard-global.js|CACHE=hit" "m1-global|m1-leaderboard-global.js|CACHE=miss" \
         "m2-filtered|m2-leaderboard-filtered.js|CACHE=hit" "m3-p1|m3-leaderboard-platform.js|CACHE=hit PAGE=1" \
         "m3-deep|m3-leaderboard-platform.js|CACHE=hit PAGE=deep" "m4-daily|m4-daily-activity.js|CACHE=hit" "m5-user|m5-user-rank.js|X=1"; do
  IFS='|' read -r n s e <<<"$v"
  api_restart
  k6run "cold-$n-${e//[= ]/_}" "$s" MODE=cold DURATION_S="$COLD_DURATION_S" $e
done

api_restart
for v in "m1-global|m1-leaderboard-global.js|CACHE=hit" "m1-global|m1-leaderboard-global.js|CACHE=miss" \
         "m2-filtered|m2-leaderboard-filtered.js|CACHE=hit" "m2-filtered|m2-leaderboard-filtered.js|CACHE=miss" \
         "m3-p1|m3-leaderboard-platform.js|CACHE=hit PAGE=1" "m3-p1|m3-leaderboard-platform.js|CACHE=miss PAGE=1" \
         "m3-deep|m3-leaderboard-platform.js|CACHE=hit PAGE=deep" "m3-deep|m3-leaderboard-platform.js|CACHE=miss PAGE=deep" \
         "m4-daily|m4-daily-activity.js|CACHE=hit" "m4-daily|m4-daily-activity.js|CACHE=miss" "m5-user|m5-user-rank.js|X=1" \
         "m6-g50|m6-group-leaderboard.js|GROUP=g50"; do
  IFS='|' read -r n s e <<<"$v"
  k6run "warm-$n-${e//[= ]/_}" "$s" MODE=warm WARMUP_S="$WARMUP_S" DURATION_S="$DURATION_S" $e
done
k6run "warm-m6-g500" m6-group-leaderboard.js MODE=warm WARMUP_S="$WARMUP_S" DURATION_S="$G500_DURATION_S" GROUP=g500
ev "PHASE read-end"

npx tsx scripts/explain.ts "$OUT/explain" --pgss-only >>"$OUT/logs/explain.log" 2>&1 || ev "WARN pgss dump failed"
npx tsx scripts/explain.ts "$OUT/explain" >>"$OUT/logs/explain.log" 2>&1 || ev "WARN explain failed"
api_ok || api_restart
npx tsx scripts/rank-consistency.ts "$OUT/rank-consistency.json" >"$OUT/logs/rank.log" 2>&1 || ev "WARN rank consistency failed"
npx tsx scripts/table-sizes.ts "$OUT/table-sizes.json" >"$OUT/logs/sizes.log" 2>&1 || ev "WARN table sizes failed"
npx tsx scripts/time-rebuild.ts "$OUT/rebuild.json" 3 >"$OUT/logs/rebuild.log" 2>&1 || ev "WARN rebuild timing failed"

# ---------------------------------------------------------------- 3. mutating phases (M9, M14, M10): mock platform at 300 ms
ev "PHASE mutate-start"
mock_start 300 0
api_restart
k6run "warm-m9-connect" m9-connect.js MODE=warm WARMUP_S="$WARMUP_S" DURATION_S="$DURATION_S" RATE=1
api_restart
k6run "m14-concurrent-connect" m14-concurrent-connect.js X=1
grep -c "Unique constraint\|rebuild failed\|deadlock" "$OUT/logs/api.log" >"$OUT/m14-api-error-lines.txt" 2>/dev/null

mock_start 300 0.02
export LEETCODE_BASE_URL=http://localhost:4100 CODEFORCES_BASE_URL=http://localhost:4100 CODECHEF_BASE_URL=http://localhost:4100
if [ -n "${SYNC_FULL:-}" ]; then SYNC_ARG="--full"; else SYNC_ARG="--sample=$SYNC_SAMPLE"; fi
ev "START sync $SYNC_ARG"
npx tsx scripts/time-sync.ts "$OUT/sync.json" $SYNC_ARG >"$OUT/logs/sync.log" 2>&1 || ev "WARN sync timing failed"
ev "END sync"
unset LEETCODE_BASE_URL CODEFORCES_BASE_URL CODECHEF_BASE_URL
ev "PHASE mutate-end"
mock_stop

# ---------------------------------------------------------------- 4. frontend (M18)
if [ -z "${SKIP_LIGHTHOUSE:-}" ]; then
  api_ok || api_restart
  ev "START lighthouse"
  "$HERE/lighthouse.sh" "$LABEL" "$OUT/lighthouse" >"$OUT/logs/lighthouse.log" 2>&1
  rc=$?; [ $rc -eq 3 ] && ev "SKIP lighthouse not installed" || { [ $rc -ne 0 ] && ev "WARN lighthouse exit=$rc"; }
  ev "END lighthouse"
else
  ev "SKIP lighthouse (SKIP_LIGHTHOUSE/QUICK)"
fi

# ---------------------------------------------------------------- 5. summary
kill "$RSS_PID" 2>/dev/null
npx tsx scripts/summarize.ts "$OUT" >"$OUT/logs/summarize.log" 2>&1 && ev "wrote $OUT/summary.md" || ev "ERROR summarize failed"
echo "$OUT/summary.md"
