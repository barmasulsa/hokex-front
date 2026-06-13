-- 날짜별 방문자 데이터 변화 추적 쿼리
-- 
-- 이 파일은 SQL 함수 변경 전후를 비교합니다.
-- 
-- 실행 방법:
-- 1. 먼저 fix-daily-stats-first-visit.sql 실행 전에 이 파일 실행
-- 2. 결과 저장
-- 3. fix-daily-stats-first-visit.sql 실행
-- 4. 다시 이 파일 실행
-- 5. 두 결과 비교

SELECT '========================================' as divider;
SELECT '1. 현재 함수 정의 확인' as step;
SELECT '========================================' as divider;

SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_visitor_statistics';

SELECT '========================================' as divider;
SELECT '2. 현재 함수 실행 결과' as step;
SELECT '========================================' as divider;

SELECT get_visitor_statistics('hokex.xyz');

SELECT '========================================' as divider;
SELECT '3. 날짜별 데이터 직접 계산 (첫 방문일 기준)' as step;
SELECT '========================================' as divider;

WITH first_visits AS (
  SELECT 
    vl.visitor_ip,
    MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date,
    MIN(vl.created_at) as first_visit_time
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY vl.visitor_ip
)
SELECT 
  first_visit_date as "날짜",
  COUNT(*) as "신규 방문자 수",
  string_agg(
    visitor_ip || ' (' || TO_CHAR(first_visit_time, 'HH24:MI:SS') || ')', 
    ', ' 
    ORDER BY first_visit_time
  ) as "방문자 IP (시간)"
FROM first_visits
GROUP BY first_visit_date
ORDER BY first_visit_date DESC;

SELECT '========================================' as divider;
SELECT '4. 날짜별 모든 접속 기록 (중복 포함)' as step;
SELECT '========================================' as divider;

WITH daily_visits AS (
  SELECT 
    DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
    vl.visitor_ip,
    COUNT(*) as visit_count
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul'), vl.visitor_ip
)
SELECT 
  visit_date as "날짜",
  COUNT(DISTINCT visitor_ip) as "순수 방문자",
  COUNT(*) as "총 접속 기록",
  string_agg(
    visitor_ip || '(' || visit_count || '회)', 
    ', ' 
    ORDER BY visitor_ip
  ) as "방문자 상세"
FROM daily_visits
GROUP BY visit_date
ORDER BY visit_date DESC;

SELECT '========================================' as divider;
SELECT '5. 검증: 날짜별 합 vs 전체 방문자' as step;
SELECT '========================================' as divider;

WITH first_visits AS (
  SELECT 
    vl.visitor_ip,
    MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY vl.visitor_ip
),
daily_counts AS (
  SELECT 
    first_visit_date,
    COUNT(*) as daily_first_visitors
  FROM first_visits
  GROUP BY first_visit_date
),
totals AS (
  SELECT 
    (SELECT SUM(daily_first_visitors) FROM daily_counts) as sum_of_daily,
    (SELECT COUNT(DISTINCT visitor_ip) FROM visitor_logs vl JOIN visitor_sites vs ON vl.site_id = vs.id WHERE vs.domain = 'hokex.xyz') as total_unique
)
SELECT 
  sum_of_daily as "날짜별 합계",
  total_unique as "전체 고유 방문자",
  sum_of_daily - total_unique as "차이",
  CASE 
    WHEN sum_of_daily = total_unique THEN '✅ 일치 (정상)'
    ELSE '❌ 불일치 (문제 있음)'
  END as "검증 결과"
FROM totals;

SELECT '========================================' as divider;
SELECT '6. 함수의 daily_stats vs 실제 데이터 비교' as step;
SELECT '========================================' as divider;

WITH function_result AS (
  SELECT get_visitor_statistics('hokex.xyz') as result
),
function_daily AS (
  SELECT 
    (jsonb_array_elements((result->'daily_stats')::jsonb)->>'date')::date as func_date,
    (jsonb_array_elements((result->'daily_stats')::jsonb)->>'count')::int as func_count
  FROM function_result
),
actual_daily AS (
  SELECT 
    first_visit_date as actual_date,
    COUNT(*) as actual_count
  FROM (
    SELECT 
      vl.visitor_ip,
      MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
    FROM visitor_logs vl
    JOIN visitor_sites vs ON vl.site_id = vs.id
    WHERE vs.domain = 'hokex.xyz'
      AND DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY vl.visitor_ip
  ) first_visits
  GROUP BY first_visit_date
)
SELECT 
  COALESCE(fd.func_date, ad.actual_date) as "날짜",
  COALESCE(fd.func_count, 0) as "함수 결과",
  COALESCE(ad.actual_count, 0) as "실제 데이터",
  CASE 
    WHEN COALESCE(fd.func_count, 0) = COALESCE(ad.actual_count, 0) THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as "비교"
FROM function_daily fd
FULL OUTER JOIN actual_daily ad ON fd.func_date = ad.actual_date
ORDER BY COALESCE(fd.func_date, ad.actual_date) DESC;

SELECT '========================================' as divider;
SELECT '7. 각 IP의 전체 방문 기록' as step;
SELECT '========================================' as divider;

SELECT 
  vl.visitor_ip as "IP",
  MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as "첫 방문일",
  MAX(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as "마지막 방문일",
  COUNT(*) as "총 접속 횟수",
  COUNT(DISTINCT DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as "방문한 날 수",
  string_agg(
    DISTINCT DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')::text, 
    ', ' 
    ORDER BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')::text
  ) as "방문 날짜 목록"
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY vl.visitor_ip
ORDER BY MIN(vl.created_at);

SELECT '========================================' as divider;
SELECT '✅ 추적 완료!' as status;
SELECT '========================================' as divider;
