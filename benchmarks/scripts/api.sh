#!/usr/bin/env bash
# Start/stop/restart the built backend (backend/dist/server.js) with the bench environment.
#   scripts/api.sh start|stop|restart   [env overrides via the caller's environment]
# State: $BENCH_RUN_DIR (default benchmarks/.run): api.pid, api.log. Waits for GET /leaderboard/ping.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${BENCH_RUN_DIR:-$HERE/.run}"
mkdir -p "$RUN_DIR"
PIDFILE="$RUN_DIR/api.pid"; LOG="${API_LOG:-$RUN_DIR/api.log}"
ENV_FILE="$HERE/.env.bench"; [ -f "$ENV_FILE" ] || ENV_FILE="$HERE/.env.bench.example"

stop() {
  if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE")"
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
}
start() {
  stop
  # Callers' explicit env (e.g. NODE_ENV=development for query capture) wins over the env file.
  (
    cd "$HERE/../backend"
    saved="$(export -p)"
    set -a; . "$ENV_FILE"; set +a
    eval "$saved" 2>/dev/null || true
    export DISABLE_CRON=true BENCH_DISABLE_RATE_LIMIT="${BENCH_DISABLE_RATE_LIMIT:-true}"
    nohup node dist/server.js >>"$LOG" 2>&1 &
    echo $! >"$PIDFILE"
  )
  for _ in $(seq 1 100); do
    curl -sf "http://localhost:${PORT:-4000}/leaderboard/ping" >/dev/null 2>&1 && return 0
    sleep 0.2
  done
  echo "API did not become healthy; see $LOG" >&2; exit 1
}
case "${1:-}" in
  start) start ;; stop) stop ;; restart) start ;;
  *) echo "usage: $0 start|stop|restart" >&2; exit 2 ;;
esac
