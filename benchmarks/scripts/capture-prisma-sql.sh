#!/usr/bin/env bash
# Captures the SQL Prisma generates for each read endpoint (prisma query logging is on when NODE_ENV=development;
# db.ts logs "query" only then). Output: sql/captured/prisma-queries.log, one block per endpoint.
# This restarts the API with NODE_ENV=development for a few requests only; never use that mode for measurements.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$HERE/sql/captured"; mkdir -p "$OUT"
LOG="$(mktemp)"; trap 'rm -f "$LOG"' EXIT
FIX="$HERE/k6/fixtures.json"
fx() { python3 -c "import json,sys;f=json.load(open('$FIX'));print(eval(sys.argv[1]))" "$1"; }
USER_ID="$(fx "f['rankUsers'][0]")"
G50="$(fx "f['groups']['g50']['groupId']")"; T50="$(fx "f['groups']['g50']['token']")"
B="$(fx "f['filters'][0]['batch']")"; BR="$(fx "f['filters'][0]['branch']")"
API="http://localhost:${PORT:-4000}"
NODE_ENV=development API_LOG="$LOG" "$HERE/scripts/api.sh" restart
: > "$OUT/prisma-queries.log"
hit() { # label, curl args...
  local label="$1"; shift
  : > "$LOG"; curl -s -o /dev/null "$@"; sleep 0.5
  { echo "### $label"; grep '^prisma:query' "$LOG" | sed 's/^prisma:query //'; echo; } >> "$OUT/prisma-queries.log"
}
hit "GET /leaderboard (global page 1)"                          "$API/leaderboard?page=1&limit=50"
hit "GET /leaderboard?batch=$B&branch=$BR"                      "$API/leaderboard?batch=$B&branch=$BR&page=1&limit=50"
hit "GET /leaderboard?platform=codeforces (raw SQL)"            "$API/leaderboard?platform=codeforces&page=1&limit=50"
hit "GET /leaderboard/daily-activity"                           "$API/leaderboard/daily-activity?page=1&limit=50"
hit "GET /leaderboard/user/$USER_ID"                            "$API/leaderboard/user/$USER_ID"
hit "GET /groups/$G50/leaderboard (50 members)"                 -H "Authorization: Bearer $T50" "$API/groups/$G50/leaderboard"
"$HERE/scripts/api.sh" stop
echo "[capture] wrote $OUT/prisma-queries.log"
