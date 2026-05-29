-- ============================================
-- 방문자 통계 캐시 즉시 업데이트 (에러 없이)
-- ============================================
-- 
-- Cron Job 없이 캐시만 업데이트합니다.
-- Supabase SQL Editor에서 실행하세요.
-- ============================================

-- 1. 현재 캐시 상태 확인
SELECT 
  '=== 업데이트 전 ===' as status,
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  updated_at as "마지막업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 2. 캐시 강제 업데이트
WITH stats AS (
  SELECT 
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count ELSE 0 END), 0) as last_30_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN visit_count ELSE 0 END), 0) as last_365_days_count,
    COALESCE(SUM(visit_count), 0) as total_count,
    MIN(visit_date) as first_date
  FROM visitor_stats
)
UPDATE visitor_stats_cache
SET 
  today = (SELECT today_count FROM stats),
  yesterday = (SELECT yesterday_count FROM stats),
  last_7_days = (SELECT last_7_days_count FROM stats),
  last_30_days = (SELECT last_30_days_count FROM stats),
  last_365_days = (SELECT last_365_days_count FROM stats),
  total_visits = (SELECT total_count FROM stats),
  first_visit_date = (SELECT first_date FROM stats),
  updated_at = NOW()
WHERE cache_key = 'summary';

-- 3. 업데이트 후 캐시 확인
SELECT 
  '=== ✅ 업데이트 완료 ===' as status,
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  updated_at as "마지막업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 4. 실제 데이터와 비교
SELECT 
  '=== 실제 데이터 (최근 7일) ===' as status,
  visit_date as "날짜",
  SUM(visit_count) as "방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
