-- 방문자 통계 시스템 전체 상태 확인
-- 이 쿼리를 Supabase SQL Editor에서 실행하세요

-- ============================================
-- 1. 캐시 테이블 확인 (visitor_stats_cache)
-- ============================================
SELECT 
  '=== 캐시 테이블 (visitor_stats_cache) ===' as section,
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  last_365_days as "최근1년",
  total_visits as "총방문수",
  first_visit_date as "첫방문일",
  updated_at as "마지막업데이트",
  created_at as "생성일시"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ============================================
-- 2. 원본 통계 테이블 확인 (visitor_stats)
-- ============================================
SELECT 
  '=== 원본 통계 테이블 (visitor_stats) ===' as section,
  COUNT(*) as "총레코드수",
  MIN(visit_date) as "가장오래된날짜",
  MAX(visit_date) as "가장최근날짜",
  SUM(visit_count) as "총방문수"
FROM visitor_stats;

-- ============================================
-- 3. 오늘 방문 통계 (시간대별)
-- ============================================
SELECT 
  '=== 오늘 방문 통계 (시간대별) ===' as section,
  visit_date as "날짜",
  visit_hour as "시간",
  visit_count as "방문수",
  created_at as "기록시간"
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- ============================================
-- 4. 최근 7일 일별 통계
-- ============================================
SELECT 
  '=== 최근 7일 일별 통계 ===' as section,
  visit_date as "날짜",
  SUM(visit_count) as "방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ============================================
-- 5. 최근 30일 일별 통계
-- ============================================
SELECT 
  '=== 최근 30일 일별 통계 ===' as section,
  visit_date as "날짜",
  SUM(visit_count) as "방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ============================================
-- 6. RPC 함수 확인 (increment_visitor_stat)
-- ============================================
SELECT 
  '=== RPC 함수 확인 ===' as section,
  routine_name as "함수명",
  routine_type as "타입",
  data_type as "반환타입"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_visitor_stat';

-- ============================================
-- 7. 테이블 존재 여부 확인
-- ============================================
SELECT 
  '=== 테이블 존재 여부 ===' as section,
  table_name as "테이블명",
  table_type as "타입"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('visitor_stats', 'visitor_stats_cache')
ORDER BY table_name;

-- ============================================
-- 8. RLS 정책 확인
-- ============================================
SELECT 
  '=== RLS 정책 확인 ===' as section,
  tablename as "테이블",
  policyname as "정책명",
  permissive as "허용여부",
  roles as "역할",
  cmd as "명령",
  qual as "조건"
FROM pg_policies
WHERE tablename IN ('visitor_stats', 'visitor_stats_cache')
ORDER BY tablename, policyname;

-- ============================================
-- 9. 캐시 업데이트 필요 여부 확인
-- ============================================
SELECT 
  '=== 캐시 업데이트 필요 여부 ===' as section,
  cache_key,
  updated_at as "마지막업데이트",
  NOW() - updated_at as "경과시간",
  CASE 
    WHEN NOW() - updated_at > INTERVAL '30 minutes' THEN '⚠️ 업데이트 필요 (30분 이상 경과)'
    WHEN NOW() - updated_at > INTERVAL '10 minutes' THEN '⚠️ 업데이트 권장 (10분 이상 경과)'
    ELSE '✅ 최신 상태'
  END as "상태"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ============================================
-- 10. Google Analytics 설정 확인 (프론트엔드)
-- ============================================
-- 참고: 이 부분은 프론트엔드 코드에서 확인해야 합니다
-- src/main.tsx 또는 index.html에서 gtag 스크립트 확인
SELECT '=== Google Analytics 확인 ===' as section,
       'Google Analytics는 프론트엔드 코드에서 확인하세요' as message,
       '1. index.html에서 gtag 스크립트 확인' as step1,
       '2. Measurement ID (G-XXXXXXXXXX) 확인' as step2,
       '3. detailedAnalytics.ts에서 recordDetailedVisit() 호출 확인' as step3;
