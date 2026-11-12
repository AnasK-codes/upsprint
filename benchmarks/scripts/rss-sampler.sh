#!/usr/bin/env bash
# M13: samples the API process RSS (KB) every INTERVAL seconds into a CSV until killed.
#   scripts/rss-sampler.sh <pidfile> <out.csv> [interval=1]
# Re-reads the pidfile every tick so API restarts (cold runs) are followed.
PIDFILE="$1"; OUT="$2"; INTERVAL="${3:-1}"
echo "epoch,pid,rss_kb" > "$OUT"
while true; do
  if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE")"
    rss="$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')"
    [ -n "$rss" ] && echo "$(date +%s),$pid,$rss" >> "$OUT"
  fi
  sleep "$INTERVAL"
done
