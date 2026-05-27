-- 방문자 통계 DB 상태 확인

-- 1. visitor_stats 테이블의 최근 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 20;

-- 2. 오늘 날짜의 총 방문 수
SELECT 
  visit_date,
  SUM(visit_count) as total_visits
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
GROUP BY visit_date;

-- 3. 최근 7일간 일별 방문 수
SELECT 
  visit_date,
  SUM(visit_count) as daily_visits
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 4. visitor_stats_cache 테이블 확인
SELECT 
  cache_key,
  today,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 5. 전체 통계 요약
SELECT 
  COUNT(DISTINCT visit_date) as total_days,
  SUM(visit_count) as total_visits,
  MIN(visit_date) as first_visit,
  MAX(visit_date) as last_visit
FROM visitor_stats;
