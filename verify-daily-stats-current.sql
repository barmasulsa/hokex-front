-- 현재 날짜별 통계 실제 값 확인
-- 문제: 날짜별 합이 10명으로 표시됨

-- 1. 전체 방문 로그 (IP별로 어느 날짜에 방문했는지)
SELECT '=== 전체 방문 로그 (IP별 방문 날짜) ===' as step;
SELECT 
  visitor_ip,
  DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(*) as visits_on_that_day
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY visitor_ip, DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visitor_ip, visit_date DESC;

-- 2. 전체 기간 중복 제거
SELECT '=== 전체 기간 DISTINCT 집계 ===' as step;
SELECT 
  COUNT(DISTINCT vl.visitor_ip) as total_unique_visitors,
  COUNT(*) as total_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz';

-- 3. 날짜별 중복 제거 집계 (현재 SQL 함수 로직)
SELECT '=== 날짜별 DISTINCT 집계 (현재 로직) ===' as step;
SELECT 
  DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(DISTINCT vl.visitor_ip) as unique_visitors_per_day,
  COUNT(*) as total_visits_per_day
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visit_date DESC;

-- 4. 날짜별 합계
SELECT '=== 날짜별 합계 ===' as step;
SELECT 
  SUM(daily_unique) as sum_of_daily_unique_visitors
FROM (
  SELECT 
    DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
    COUNT(DISTINCT vl.visitor_ip) as daily_unique
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
) daily_counts;

-- 5. 현재 SQL 함수 반환값 확인
SELECT '=== 현재 get_visitor_statistics 함수 결과 ===' as step;
SELECT get_visitor_statistics('hokex.xyz') as full_result;

-- 6. daily_stats만 추출
SELECT '=== daily_stats 배열 ===' as step;
SELECT 
  (get_visitor_statistics('hokex.xyz')::json->'daily_stats')::json as daily_stats_array;

-- 설명:
-- 
-- 만약 결과가:
-- - 전체 DISTINCT: 6명
-- - 날짜별 합: 10명
-- 
-- 이유:
-- 같은 IP가 여러 날짜에 방문
-- 예: IP "1.1.1.1"이 3일 방문 → 날짜별 각각 1명씩 = 3명 합산
--     하지만 전체 기간으로 보면 1명
-- 
-- 이것은 **정상 동작**입니다!
-- 날짜별 통계는 시각화용이며, 각 날짜의 중복 제거된 값을 단순 합산하면
-- 전체 중복 제거 수와 다를 수밖에 없습니다.
