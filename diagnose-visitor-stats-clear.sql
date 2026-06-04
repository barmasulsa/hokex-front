-- 방문자 통계 진단 스크립트 (결과가 명확하게 보이는 버전)
-- 각 검사 결과가 구분되어 표시됩니다

-- ========================================
-- 1번: visitor_stats 테이블 전체 현황
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1번: visitor_stats 테이블 전체 현황';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '1번' as "검사번호",
  'visitor_stats 테이블 데이터' as "검사항목",
  COUNT(*) as "총레코드수",
  COUNT(DISTINCT visit_date) as "고유날짜수",
  MIN(visit_date)::text as "첫방문일",
  MAX(visit_date)::text as "마지막방문일",
  SUM(visit_count) as "총방문수"
FROM visitor_stats;

-- ========================================
-- 2번: 오늘 데이터 상세
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '2번: 오늘 데이터 상세';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '2번' as "검사번호",
  visit_date::text as "날짜",
  visit_hour as "시간",
  visit_count as "방문수",
  created_at::text as "생성시각",
  updated_at::text as "수정시각"
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- ========================================
-- 3번: 최근 7일 일별 통계
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '3번: 최근 7일 일별 통계';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '3번' as "검사번호",
  visit_date::text as "날짜",
  SUM(visit_count) as "일별총방문수",
  COUNT(*) as "시간대레코드수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ========================================
-- 4번: 캐시 테이블 스키마
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '4번: visitor_stats_cache 테이블 스키마';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '4번' as "검사번호",
  column_name as "컬럼명",
  data_type as "데이터타입",
  is_nullable as "NULL허용"
FROM information_schema.columns
WHERE table_name = 'visitor_stats_cache'
ORDER BY ordinal_position;

-- ========================================
-- 5번: 캐시 데이터 현황
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '5번: 캐시 데이터 현황';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '5번' as "검사번호",
  cache_key as "캐시키",
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  first_visit_date::text as "첫방문일",
  updated_at::text as "캐시수정시각",
  ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60, 1) as "업데이트후경과분"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 6번: 오늘 실제 데이터 vs 캐시 비교
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '6번: 오늘 실제 데이터 vs 캐시 비교';
  RAISE NOTICE '========================================';
END $$;

WITH actual_today AS (
  SELECT COALESCE(SUM(visit_count), 0) as actual_count
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE
),
cached_today AS (
  SELECT today as cached_count
  FROM visitor_stats_cache
  WHERE cache_key = 'summary'
)
SELECT 
  '6번' as "검사번호",
  actual_today.actual_count as "실제오늘방문수",
  cached_today.cached_count as "캐시오늘방문수",
  actual_today.actual_count - cached_today.cached_count as "차이",
  CASE 
    WHEN actual_today.actual_count = cached_today.cached_count THEN '✅ 일치'
    WHEN ABS(actual_today.actual_count - cached_today.cached_count) <= 5 THEN '⚠️ 약간차이'
    ELSE '❌ 큰차이'
  END as "상태"
FROM actual_today, cached_today;

-- ========================================
-- 7번: 어제 실제 데이터 vs 캐시 비교
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '7번: 어제 실제 데이터 vs 캐시 비교';
  RAISE NOTICE '========================================';
END $$;

WITH actual_yesterday AS (
  SELECT COALESCE(SUM(visit_count), 0) as actual_count
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'
),
cached_yesterday AS (
  SELECT yesterday as cached_count
  FROM visitor_stats_cache
  WHERE cache_key = 'summary'
)
SELECT 
  '7번' as "검사번호",
  actual_yesterday.actual_count as "실제어제방문수",
  cached_yesterday.cached_count as "캐시어제방문수",
  actual_yesterday.actual_count - cached_yesterday.cached_count as "차이",
  CASE 
    WHEN actual_yesterday.actual_count = cached_yesterday.cached_count THEN '✅ 일치'
    WHEN ABS(actual_yesterday.actual_count - cached_yesterday.cached_count) <= 5 THEN '⚠️ 약간차이'
    ELSE '❌ 큰차이'
  END as "상태"
FROM actual_yesterday, cached_yesterday;

-- ========================================
-- 8번: 최근 1시간 데이터 (실시간 추적 확인)
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '8번: 최근 1시간 데이터';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '8번' as "검사번호",
  visit_date::text as "날짜",
  visit_hour as "시간",
  visit_count as "방문수",
  created_at::text as "생성시각",
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60, 1) as "생성후경과분"
FROM visitor_stats
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 9번: RPC 함수 존재 여부
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '9번: increment_visitor_stat 함수 확인';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '9번' as "검사번호",
  proname as "함수명",
  CASE 
    WHEN proname IS NOT NULL THEN '✅ 존재함'
    ELSE '❌ 없음'
  END as "상태"
FROM pg_proc
WHERE proname = 'increment_visitor_stat';

-- ========================================
-- 10번: RLS 정책 확인
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '10번: visitor_stats RLS 정책';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '10번' as "검사번호",
  tablename as "테이블",
  policyname as "정책명",
  cmd as "명령",
  roles::text as "역할"
FROM pg_policies
WHERE tablename = 'visitor_stats';

-- ========================================
-- 11번: 중복 데이터 확인
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '11번: 중복 데이터 확인';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '11번' as "검사번호",
  visit_date::text as "날짜",
  visit_hour as "시간",
  COUNT(*) as "중복개수"
FROM visitor_stats
GROUP BY visit_date, visit_hour
HAVING COUNT(*) > 1;

-- ========================================
-- 최종 요약
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 진단 완료';
  RAISE NOTICE '========================================';
  RAISE NOTICE '위 결과를 확인하여 문제를 파악하세요:';
  RAISE NOTICE '- 6번: 오늘 방문수가 0이면 → 프론트엔드 추적 문제';
  RAISE NOTICE '- 7번: 어제 방문수가 0이면 → 캐시 업데이트 문제';
  RAISE NOTICE '- 5번: 캐시 수정시각이 오래되었으면 → Edge Function 문제';
  RAISE NOTICE '- 8번: 최근 1시간 데이터가 없으면 → 실시간 추적 문제';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  '✅ 진단 완료' as "상태",
  NOW()::text as "진단시각";
