-- 날짜별 방문자 통계 중복 문제 진단
-- 
-- 문제: 날짜별 합이 10명인데 총 방문자는 6명
-- 원인 분석 필요

-- 1. 전체 데이터 확인
SELECT '=== 전체 방문 로그 ===' as step;
SELECT 
  DATE(created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  visitor_ip,
  COUNT(*) as visit_count
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), visitor_ip
ORDER BY visit_date DESC, visitor_ip;

-- 2. 날짜별 중복 제거 집계 (현재 로직)
SELECT '=== 날짜별 DISTINCT 집계 ===' as step;
SELECT 
  DATE(created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(DISTINCT visitor_ip) as unique_visitors,
  COUNT(*) as total_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visit_date DESC;

-- 3. 전체 중복 제거
SELECT '=== 전체 기간 DISTINCT 집계 ===' as step;
SELECT 
  COUNT(DISTINCT visitor_ip) as total_unique_visitors,
  COUNT(*) as total_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz';

-- 4. 중복 방문자 확인 (여러 날짜에 방문한 사람)
SELECT '=== 여러 날짜 방문한 IP ===' as step;
SELECT 
  visitor_ip,
  COUNT(DISTINCT DATE(created_at AT TIME ZONE 'Asia/Seoul')) as visit_days,
  array_agg(DISTINCT DATE(created_at AT TIME ZONE 'Asia/Seoul') ORDER BY DATE(created_at AT TIME ZONE 'Asia/Seoul') DESC) as dates
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
GROUP BY visitor_ip
HAVING COUNT(DISTINCT DATE(created_at AT TIME ZONE 'Asia/Seoul')) > 1
ORDER BY visit_days DESC;

-- 5. 현재 SQL 함수가 반환하는 daily_stats 확인
SELECT '=== 현재 SQL 함수 daily_stats 결과 ===' as step;
SELECT 
  (get_visitor_statistics('hokex.xyz')::json->'daily_stats')::text as daily_stats;

-- 설명
-- 
-- 예상 시나리오:
-- - 같은 IP가 여러 날짜에 방문하면
-- - 날짜별 집계: 각 날짜마다 1명씩 카운트 → 합 10명
-- - 전체 집계: 전체 기간에서 1명 → 6명
-- 
-- 이것이 정상 동작입니다!
-- 
-- 만약 날짜별 합을 전체와 일치시키려면:
-- - 날짜별 통계를 COUNT(*)로 변경 (중복 제거 안 함)
-- - 또는 프론트엔드에 "날짜별은 시각화용, 합계 아님" 안내

