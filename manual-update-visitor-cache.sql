-- 방문자 통계 캐시 수동 업데이트 SQL
-- 오늘 방문자 수가 제대로 집계되지 않을 때 실행

-- 1. 현재 캐시 상태 확인
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

-- 2. 오늘 실제 방문자 수 계산
SELECT 
  CURRENT_DATE as visit_date,
  SUM(visit_count) as actual_today_count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE;

-- 3. 최근 7일 실제 방문자 수 계산
SELECT 
  SUM(visit_count) as actual_last_7_days
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days';

-- 4. 최근 30일 실제 방문자 수 계산
SELECT 
  SUM(visit_count) as actual_last_30_days
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days';

-- 5. 캐시 강제 업데이트 (전체 재계산)
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

-- 6. 업데이트 후 캐시 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  first_visit_date,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 7. 오늘 시간대별 방문 현황 확인
SELECT 
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;
