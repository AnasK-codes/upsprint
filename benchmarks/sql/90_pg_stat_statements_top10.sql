-- M7: top 10 statements by mean execution time. Run after a k6 phase (run-all resets the stats before it).
SELECT left(regexp_replace(query, '\s+', ' ', 'g'), 220) AS query,
       calls,
       round(mean_exec_time::numeric, 2) AS mean_ms,
       round(max_exec_time::numeric, 2) AS max_ms,
       round(total_exec_time::numeric, 0) AS total_ms,
       rows
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query NOT ILIKE '%pg_stat_statements%'
  AND calls >= 2
ORDER BY mean_exec_time DESC
LIMIT 10;
