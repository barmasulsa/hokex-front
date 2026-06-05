-- 1. 오늘 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats 
WHERE visit_date = '2026-06-04'
ORDER BY visit_hour DESC
LIMIT 10;

-- 2. 캐시 상태 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  total_visits,
  updated_at
FROM visitor_stats_cache 
WHERE cache_key = 'summary';

-- 3. 최근 방문 기록 확인 (지난 3일)
SELECT 
  visit_date,
  COUNT(*) as record_count,
  SUM(visit_count) as total_visitors
FROM visitor_stats 
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
