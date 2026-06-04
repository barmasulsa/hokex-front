-- 방문자 통계 캐시 강제 업데이트
-- 실제 visitor_stats 데이터를 기반으로 캐시를 다시 계산

-- ========================================
-- 1단계: 현재 상태 확인
-- ========================================
SELECT 
  '업데이트 전 캐시 상태' as info,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 2단계: 실제 데이터 집계
-- ========================================
WITH date_ranges AS (
  SELECT 
    CURRENT_DATE as today,
    CURRENT_DATE - INTERVAL '1 day' as yesterday,
    CURRENT_DATE - INTERVAL '7 days' as seven_days_ago,
    CURRENT_DATE - INTERVAL '30 days' as thirty_days_ago,
    CURRENT_DATE - INTERVAL '365 days' as one_year_ago
),
stats AS (
  SELECT
    -- 오늘
    COALESCE(SUM(CASE WHEN visit_date = (SELECT today FROM date_ranges) THEN visit_count ELSE 0 END), 0) as today_count,
    -- 어제
    COALESCE(SUM(CASE WHEN visit_date = (SELECT yesterday FROM date_ranges) THEN visit_count ELSE 0 END), 0) as yesterday_count,
    -- 최근 7일
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT seven_days_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    -- 최근 30일
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT thirty_days_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_30_days_count,
    -- 최근 365일
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT one_year_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_365_days_count,
    -- 전체
    COALESCE(SUM(visit_count), 0) as total_visits_count,
    -- 첫 방문일
    MIN(visit_date) as first_visit_date
  FROM visitor_stats
)
SELECT 
  '실제 데이터 집계 결과' as info,
  today_count as today,
  yesterday_count as yesterday,
  last_7_days_count as last_7_days,
  last_30_days_count as last_30_days,
  last_365_days_count as last_365_days,
  total_visits_count as total_visits,
  first_visit_date
FROM stats;

-- ========================================
-- 3단계: 캐시 업데이트
-- ========================================
WITH date_ranges AS (
  SELECT 
    CURRENT_DATE as today,
    CURRENT_DATE - INTERVAL '1 day' as yesterday,
    CURRENT_DATE - INTERVAL '7 days' as seven_days_ago,
    CURRENT_DATE - INTERVAL '30 days' as thirty_days_ago,
    CURRENT_DATE - INTERVAL '365 days' as one_year_ago
),
stats AS (
  SELECT
    COALESCE(SUM(CASE WHEN visit_date = (SELECT today FROM date_ranges) THEN visit_count ELSE 0 END), 0) as today_count,
    COALESCE(SUM(CASE WHEN visit_date = (SELECT yesterday FROM date_ranges) THEN visit_count ELSE 0 END), 0) as yesterday_count,
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT seven_days_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT thirty_days_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_30_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= (SELECT one_year_ago FROM date_ranges) THEN visit_count ELSE 0 END), 0) as last_365_days_count,
    COALESCE(SUM(visit_count), 0) as total_visits_count,
    MIN(visit_date) as first_visit_date
  FROM visitor_stats
)
INSERT INTO visitor_stats_cache (
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  first_visit_date,
  updated_at
)
SELECT
  'summary',
  today_count,
  yesterday_count,
  last_7_days_count,
  last_30_days_count,
  last_365_days_count,
  total_visits_count,
  first_visit_date,
  NOW()
FROM stats
ON CONFLICT (cache_key) 
DO UPDATE SET
  today = EXCLUDED.today,
  yesterday = EXCLUDED.yesterday,
  last_7_days = EXCLUDED.last_7_days,
  last_30_days = EXCLUDED.last_30_days,
  last_365_days = EXCLUDED.last_365_days,
  total_visits = EXCLUDED.total_visits,
  first_visit_date = EXCLUDED.first_visit_date,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- 4단계: 업데이트 결과 확인
-- ========================================
SELECT 
  '✅ 업데이트 완료 - 최종 캐시 상태' as info,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  first_visit_date,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 5단계: 검증 - 오늘 데이터 상세
-- ========================================
SELECT 
  '오늘 방문 데이터 상세' as info,
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;
