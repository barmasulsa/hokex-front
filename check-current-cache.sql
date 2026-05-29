-- 현재 캐시 상태 확인
SELECT 
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  last_365_days as "최근365일",
  total_visits as "총방문",
  updated_at as "마지막업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 실제 visitor_stats 데이터 확인
SELECT 
  visit_date as "날짜",
  SUM(visit_count) as "방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '2 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
