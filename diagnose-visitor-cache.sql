-- 방문객 통계 캐시 진단 스크립트

-- 1. 캐시 테이블 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at,
  NOW() - updated_at as cache_age
FROM visitor_stats_cache;

-- 2. 실제 visitor_stats 테이블의 오늘/어제 데이터 확인
WITH kst_now AS (
  SELECT 
    (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE as today,
    ((NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::DATE as yesterday
)
SELECT 
  'today' as period,
  vs.visit_date,
  SUM(vs.visit_count) as total_visits
FROM visitor_stats vs, kst_now
WHERE vs.visit_date = kst_now.today
GROUP BY vs.visit_date

UNION ALL

SELECT 
  'yesterday' as period,
  vs.visit_date,
  SUM(vs.visit_count) as total_visits
FROM visitor_stats vs, kst_now
WHERE vs.visit_date = kst_now.yesterday
GROUP BY vs.visit_date

ORDER BY period DESC;

-- 3. 최근 7일 데이터 확인
SELECT 
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 4. Edge Function 실행 로그 확인 (pg_cron이 있는 경우)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname LIKE '%visitor%' 
-- ORDER BY start_time DESC 
-- LIMIT 10;
