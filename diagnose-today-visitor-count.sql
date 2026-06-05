-- 오늘 방문자 통계 진단 SQL (KST 기준)

-- 1. 오늘 날짜의 visitor_stats 원본 데이터 확인 (시간대별)
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
WHERE visit_date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date
ORDER BY visit_hour;

-- 2. 오늘 날짜의 총 방문 수 (실시간 집계)
SELECT 
  visit_date,
  SUM(visit_count) as total_today
FROM visitor_stats
WHERE visit_date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date
GROUP BY visit_date;

-- 3. visitor_stats_cache 테이블의 캐시 값 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 4. 최근 10개의 visitor_stats 레코드 확인 (중복 체크)
SELECT 
  id,
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
ORDER BY created_at DESC
LIMIT 10;

-- 5. 오늘 날짜에 중복된 (visit_date, visit_hour) 조합이 있는지 확인
SELECT 
  visit_date,
  visit_hour,
  COUNT(*) as duplicate_count,
  SUM(visit_count) as total_count
FROM visitor_stats
WHERE visit_date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date
GROUP BY visit_date, visit_hour
HAVING COUNT(*) > 1;
