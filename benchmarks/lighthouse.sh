#!/usr/bin/env bash
# M18: frontend Lighthouse (mobile preset, production build) for /, /leaderboard, /profile.
#   benchmarks/lighthouse.sh <label> [outDir]       (outDir default: benchmarks/results/<label>/lighthouse)
# Needs: the seeded bench API on :4000 (scripts/api.sh start), fixtures (k6/fixtures.json), Google Chrome, and
# lighthouse available to `npx` WITHOUT downloading (we never install silently): `npm i -D lighthouse` in benchmarks/.
# Env: LH_RUNS=3  FRONTEND_PORT=3000  API_URL=http://localhost:4000  CHROME_PATH=...  SKIP_BUILD=1
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="${1:?usage: lighthouse.sh <label> [outDir]}"
OUT="${2:-$HERE/results/$LABEL/lighthouse}"
RUNS="${LH_RUNS:-3}"; PORT="${FRONTEND_PORT:-3000}"; API_URL="${API_URL:-http://localhost:4000}"
FE="$HERE/../frontend/my-app"
mkdir -p "$OUT/reports"

if ! (cd "$HERE" && npx --no-install lighthouse --version >/dev/null 2>&1); then
  echo "lighthouse is not installed. Install it locally first (it is not installed automatically):" >&2
  echo "    cd benchmarks && npm install --save-dev lighthouse" >&2
  exit 3
fi
if [ -z "${CHROME_PATH:-}" ] && [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fi
curl -sf "$API_URL/leaderboard/ping" >/dev/null || { echo "API not reachable at $API_URL" >&2; exit 1; }

# 1. production build against the seeded API (NEXT_PUBLIC_API_URL is baked in at build time)
if [ -z "${SKIP_BUILD:-}" ]; then
  (cd "$FE" && NEXT_PUBLIC_API_URL="$API_URL" npx next build) 2>&1 | tee "$OUT/next-build.log"
fi

node "$HERE/scripts/first-load-js.mjs" "$FE" "$OUT/first-load-js.json"

# 2. serve it
(cd "$FE" && NEXT_PUBLIC_API_URL="$API_URL" nohup npx next start -p "$PORT" >"$OUT/next-start.log" 2>&1 & echo $! >"$OUT/next.pid")
cleanup() { lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null; [ -f "$OUT/next.pid" ] && kill "$(cat "$OUT/next.pid")" 2>/dev/null; return 0; }
trap cleanup EXIT
for _ in $(seq 1 60); do curl -sf "http://localhost:$PORT/" >/dev/null && break; sleep 1; done
curl -sf "http://localhost:$PORT/" >/dev/null || { echo "next start did not come up; see $OUT/next-start.log" >&2; exit 1; }

# 3. cookie of a seeded user (same JWT_SECRET as the API)
USER_ID="$(python3 -c "import json;print(json.load(open('$HERE/k6/fixtures.json'))['rankUsers'][0])")"
TOKEN="$(cd "$HERE" && JWT_SECRET="${JWT_SECRET:-bench-secret}" npx tsx scripts/jwt.ts "$USER_ID" 86400)"
HEADERS="{\"Cookie\":\"token=$TOKEN\"}"

# 4. lighthouse x RUNS per page
for page in home:/ leaderboard:/leaderboard profile:/profile; do
  name="${page%%:*}"; path="${page#*:}"
  for i in $(seq 1 "$RUNS"); do
    echo "[lighthouse] $name run $i"
    (cd "$HERE" && npx --no-install lighthouse "http://localhost:$PORT$path" \
      --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility \
      --output=json --output-path="$OUT/reports/$name-$i.json" --quiet \
      --extra-headers="$HEADERS" \
      --chrome-flags="--headless=new --no-sandbox") || echo "[lighthouse] $name run $i FAILED" >&2
  done
done

# 5. medians + first-load JS
node "$HERE/scripts/lh-summary.mjs" "$OUT" "$OUT/first-load-js.json"
