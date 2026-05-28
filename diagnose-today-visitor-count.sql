-- 오늘 방문자 수 집계 문제 진단 SQL

-- 1. 오늘 날짜 확인
SELECT 
  CURRENT_DATE as today_date,
  CURRENT_TIMESTAMP as current_time,
  CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul' as seoul_time;

-- 2. visitor_stats 테이블에서 오늘 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 3. 오늘 총 방문자 수 계산
SELECT 
  visit_date,
  SUM(visit_count) as total_today
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
GROUP BY visit_date;

-- 4. 최근 7일 데이터 확인
SELECT 
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 5. visitor_stats_cache 테이블 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 6. Edge Function 상태 확인 (pg_cron 작업)
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%visitor%';

-- 7. 최근 방문 기록 확인 (최근 10개)
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
ORDER BY created_at DESC
LIMIT 10;

-- 8. increment_visitor_stat RPC 함수 존재 확인
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'increment_visitor_stat';
