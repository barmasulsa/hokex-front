-- 어제 실제 방문자 데이터 확인

-- 1. visitor_stats 테이블에서 어제 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY visit_hour;

-- 2. 어제 총 방문자 수
SELECT 
  visit_date,
  SUM(visit_count) as total_yesterday
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY visit_date;

-- 3. 캐시 테이블 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 4. 최근 3일간 데이터 확인
SELECT 
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
