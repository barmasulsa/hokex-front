-- 방문자 통계 진단 스크립트
-- 문제: 방문자 통계가 제대로 안 잡히는 문제 진단

-- ========================================
-- 1. visitor_stats 테이블 확인
-- ========================================
SELECT 
  '1. visitor_stats 테이블 데이터' as check_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT visit_date) as unique_dates,
  MIN(visit_date) as first_date,
  MAX(visit_date) as last_date,
  SUM(visit_count) as total_visits
FROM visitor_stats;

-- ========================================
-- 2. 오늘 데이터 확인
-- ========================================
SELECT 
  '2. 오늘 데이터' as check_name,
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- ========================================
-- 3. 최근 7일 데이터 확인
-- ========================================
SELECT 
  '3. 최근 7일 데이터' as check_name,
  visit_date,
  SUM(visit_count) as daily_total,
  COUNT(*) as hour_records
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ========================================
-- 4. visitor_stats_cache 테이블 스키마 확인
-- ========================================
SELECT 
  '4a. 캐시 테이블 컬럼 목록' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats_cache'
ORDER BY ordinal_position;

-- ========================================
-- 4b. visitor_stats_cache 데이터 확인 (존재하는 컬럼만)
-- ========================================
SELECT 
  '4b. 캐시 데이터' as check_name,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  -- last_365_days 컬럼이 있는지 확인 후 주석 해제
  -- total_visits 컬럼이 있는지 확인 후 주석 해제
  first_visit_date,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 5. RPC 함수 확인
-- ========================================
SELECT 
  '5. increment_visitor_stat 함수 존재 여부' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'increment_visitor_stat';

-- ========================================
-- 6. 테이블 권한 확인
-- ========================================
SELECT 
  '6. visitor_stats 테이블 권한' as check_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'visitor_stats'
  AND grantee IN ('anon', 'authenticated', 'service_role');

-- ========================================
-- 7. RLS 정책 확인
-- ========================================
SELECT 
  '7. visitor_stats RLS 정책' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'visitor_stats';

-- ========================================
-- 8. 최근 1시간 데이터 확인 (실시간 추적)
-- ========================================
SELECT 
  '8. 최근 1시간 데이터' as check_name,
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_ago
FROM visitor_stats
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- ========================================
-- 9. 중복 데이터 확인
-- ========================================
SELECT 
  '9. 중복 데이터 확인' as check_name,
  visit_date,
  visit_hour,
  COUNT(*) as duplicate_count
FROM visitor_stats
GROUP BY visit_date, visit_hour
HAVING COUNT(*) > 1;

-- ========================================
-- 10. 캐시 업데이트 필요 여부 확인
-- ========================================
SELECT 
  '10. 캐시 업데이트 필요 여부' as check_name,
  CASE 
    WHEN updated_at < NOW() - INTERVAL '30 minutes' THEN '⚠️ 캐시 오래됨 (30분 이상)'
    WHEN updated_at < NOW() - INTERVAL '10 minutes' THEN '⚠️ 캐시 약간 오래됨 (10분 이상)'
    ELSE '✅ 캐시 최신'
  END as cache_status,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 11. 오늘 실제 방문 수 vs 캐시 비교
-- ========================================
WITH actual_today AS (
  SELECT COALESCE(SUM(visit_count), 0) as actual_count
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE
),
cached_today AS (
  SELECT today as cached_count
  FROM visitor_stats_cache
  WHERE cache_key = 'summary'
)
SELECT 
  '11. 오늘 방문 수 비교' as check_name,
  actual_today.actual_count as actual_today,
  cached_today.cached_count as cached_today,
  actual_today.actual_count - cached_today.cached_count as difference,
  CASE 
    WHEN actual_today.actual_count = cached_today.cached_count THEN '✅ 일치'
    WHEN ABS(actual_today.actual_count - cached_today.cached_count) <= 5 THEN '⚠️ 약간 차이'
    ELSE '❌ 큰 차이 (캐시 업데이트 필요)'
  END as status
FROM actual_today, cached_today;

-- ========================================
-- 12. Edge Function 로그 확인 (최근 10개)
-- ========================================
-- 참고: Edge Function 로그는 Supabase Dashboard에서 확인
-- Dashboard → Edge Functions → update-visitor-stats-cache → Logs

-- ========================================
-- 진단 완료
-- ========================================
SELECT 
  '✅ 진단 완료' as status,
  NOW() as checked_at;
