-- ============================================
-- 방문자 데이터 진단 (2026-05-29 기준)
-- ============================================

-- 현재 시간 및 비즈니스 날짜 확인
SELECT 
  NOW() AT TIME ZONE 'Asia/Seoul' as current_kst_time,
  EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Seoul') as current_hour,
  CURRENT_DATE as sql_current_date,
  get_business_date() as business_date,
  get_business_date() - INTERVAL '1 day' as business_yesterday;

-- visitor_stats 테이블: 최근 3일 데이터
SELECT 
  '=== visitor_stats 테이블 ===' as section,
  visit_date,
  SUM(visit_count) as total_visits,
  COUNT(*) as hour_records
FROM visitor_stats
WHERE visit_date >= '2026-05-27'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- visitor_stats_cache 테이블: 현재 캐시 상태
SELECT 
  '=== visitor_stats_cache 테이블 ===' as section,
  cache_key,
  today as cache_today,
  yesterday as cache_yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 5월 28일 상세 데이터 (시간대별)
SELECT 
  '=== 2026-05-28 시간대별 상세 ===' as section,
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = '2026-05-28'
ORDER BY visit_hour;

-- 5월 29일 상세 데이터 (시간대별)
SELECT 
  '=== 2026-05-29 시간대별 상세 ===' as section,
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = '2026-05-29'
ORDER BY visit_hour;
