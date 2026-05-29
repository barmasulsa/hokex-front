-- 현재 캐시 상태 빠른 확인
SELECT 
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  updated_at as "마지막업데이트",
  NOW() - updated_at as "경과시간"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 실제 visitor_stats 테이블의 최근 데이터
SELECT 
  visit_date as "날짜",
  SUM(visit_count) as "방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 오늘과 어제 데이터 직접 계산
SELECT 
  'today' as period,
  COALESCE(SUM(visit_count), 0) as count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE

UNION ALL

SELECT 
  'yesterday' as period,
  COALESCE(SUM(visit_count), 0) as count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day';
