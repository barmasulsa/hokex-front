-- ============================================
-- 캐시 상세 확인
-- ============================================

-- 1. 스마트 캐시 현재 상태
SELECT 
  '1. 스마트 캐시 현재 상태' AS info,
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS "얼마나_오래됐나"
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 2. 실제 어제 데이터 (5월 27일)
SELECT 
  '2. 실제 어제(5/27) 데이터' AS info,
  DATE(created_at) AS "날짜",
  COUNT(*) AS "실제_방문자수"
FROM visitor_stats
WHERE DATE(created_at) = '2026-05-27'
GROUP BY DATE(created_at);

-- 3. 캐시의 "어제" 값
SELECT 
  '3. 캐시의 어제 값' AS info,
  cache_type,
  visit_count AS "캐시된_방문자수",
  last_updated AS "마지막_업데이트"
FROM visitor_stats_smart_cache
WHERE cache_type = 'yesterday';

-- 4. 비즈니스 날짜 확인
SELECT 
  '4. 비즈니스 날짜' AS info,
  NOW() AS "현재시각",
  get_business_date() AS "오늘",
  get_business_date() - INTERVAL '1 day' AS "어제_계산값";

-- 5. 캐시 업데이트 함수 확인
SELECT 
  '5. 캐시 업데이트 함수 존재 확인' AS info,
  proname AS "함수명",
  pg_get_functiondef(oid) AS "함수정의"
FROM pg_proc
WHERE proname LIKE '%visitor%cache%'
ORDER BY proname;
