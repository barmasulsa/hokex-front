-- 방문자 통계 수동 업데이트 스크립트
-- 문제: 캐시가 업데이트되지 않아 오늘/어제 방문자 수가 0으로 표시됨
-- 해결: 실제 데이터를 기반으로 캐시를 강제 업데이트

-- ========================================
-- 1. 현재 상태 확인
-- ========================================
SELECT 
  '=== 수정 전 캐시 상태 ===' as status,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근 7일",
  last_30_days as "최근 30일",
  updated_at as "마지막 업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 2. 실제 데이터 확인
-- ========================================
WITH actual_stats AS (
  SELECT
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count END), 0) as actual_today,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count END), 0) as actual_yesterday,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count END), 0) as actual_7days,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count END), 0) as actual_30days,
    COALESCE(SUM(visit_count), 0) as total_visits,
    MIN(visit_date) as first_visit_date
  FROM visitor_stats
)
SELECT 
  '=== 실제 데이터 ===' as status,
  actual_today as "실제 오늘",
  actual_yesterday as "실제 어제",
  actual_7days as "실제 최근 7일",
  actual_30days as "실제 최근 30일",
  total_visits as "총 방문",
  first_visit_date as "첫 방문일"
FROM actual_stats;

-- ========================================
-- 3. 캐시 강제 업데이트
-- ========================================
WITH actual_stats AS (
  SELECT
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count END), 0) as actual_today,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count END), 0) as actual_yesterday,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count END), 0) as actual_7days,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count END), 0) as actual_30days,
    COALESCE(SUM(visit_count), 0) as total_visits,
    MIN(visit_date) as first_visit_date
  FROM visitor_stats
)
UPDATE visitor_stats_cache
SET 
  today = actual_stats.actual_today,
  yesterday = actual_stats.actual_yesterday,
  last_7_days = actual_stats.actual_7days,
  last_30_days = actual_stats.actual_30days,
  total_visits = actual_stats.total_visits,
  first_visit_date = actual_stats.first_visit_date,
  updated_at = NOW()
FROM actual_stats
WHERE cache_key = 'summary';

-- ========================================
-- 4. 업데이트 결과 확인
-- ========================================
SELECT 
  '=== 수정 후 캐시 상태 ===' as status,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근 7일",
  last_30_days as "최근 30일",
  total_visits as "총 방문",
  first_visit_date as "첫 방문일",
  updated_at as "마지막 업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 5. 완료 메시지
-- ========================================
SELECT 
  '✅ 캐시 업데이트 완료!' as status,
  '이제 홈페이지를 새로고침하면 정확한 방문자 수가 표시됩니다.' as message,
  NOW() as updated_at;
