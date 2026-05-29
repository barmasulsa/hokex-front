-- ============================================
-- 자동 업데이트 시스템 진단
-- ============================================

-- 1. pg_cron 확장 확인
SELECT 
  '1. pg_cron 확장 설치 여부' AS step,
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- 2. Cron job 확인
SELECT 
  '2. Cron Job 상태' AS step,
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%visitor%' OR command LIKE '%visitor%'
ORDER BY jobid;

-- 3. Cron job 실행 이력 확인 (최근 10개)
SELECT 
  '3. Cron Job 실행 이력' AS step,
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time AS duration
FROM cron.job_run_details
WHERE command LIKE '%visitor%'
ORDER BY start_time DESC
LIMIT 10;

-- 4. Edge Function 확인
SELECT 
  '4. Edge Function 존재 확인' AS step,
  schema_name,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%visitor%'
ORDER BY routine_name;

-- 5. 트리거 확인
SELECT 
  '5. 트리거 확인' AS step,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%visitor%' OR action_statement LIKE '%visitor%'
ORDER BY trigger_name;

-- 6. 캐시 테이블 구조 확인
SELECT 
  '6. 캐시 테이블 구조' AS step,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats_smart_cache'
ORDER BY ordinal_position;

-- 7. 캐시 현재 상태 확인
SELECT 
  '7. 캐시 현재 상태' AS step,
  cache_type,
  visitor_count,
  last_updated,
  NOW() - last_updated AS "얼마나_오래됐나",
  CASE 
    WHEN NOW() - last_updated > INTERVAL '1 day' THEN '⚠️ 1일 이상 업데이트 안됨'
    WHEN NOW() - last_updated > INTERVAL '1 hour' THEN '⚠️ 1시간 이상 업데이트 안됨'
    WHEN NOW() - last_updated > INTERVAL '5 minutes' THEN '⚠️ 5분 이상 업데이트 안됨'
    ELSE '✅ 최근 업데이트됨'
  END AS status
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 8. 실제 방문자 데이터 확인 (검증용)
SELECT 
  '8. 실제 방문자 데이터' AS step,
  COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at >= CURRENT_DATE - INTERVAL '1 day' AND visited_at < CURRENT_DATE) AS "어제_실제",
  COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at >= CURRENT_DATE) AS "오늘_실제",
  COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days') AS "7일_실제",
  COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at >= CURRENT_DATE - INTERVAL '30 days') AS "30일_실제"
FROM visitor_stats;
