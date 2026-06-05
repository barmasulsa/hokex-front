-- ==========================================
-- 방문자 통계 긴급 진단 SQL
-- ==========================================

-- 1. visitor_stats 테이블에 데이터가 있는지 확인
SELECT 
  'visitor_stats 테이블 데이터' as 체크항목,
  COUNT(*) as 총_레코드수,
  MIN(visit_date) as 최초_날짜,
  MAX(visit_date) as 최근_날짜,
  SUM(visit_count) as 총_방문수
FROM visitor_stats;

-- 2. 오늘과 어제 데이터 확인 (KST 기준)
WITH kst_now AS (
  SELECT 
    (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::TIMESTAMP as now_kst,
    (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE as today_kst,
    ((NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::DATE as yesterday_kst
)
SELECT 
  '오늘과 어제 방문자 (KST)' as 체크항목,
  kst_now.today_kst as 오늘날짜,
  COALESCE(SUM(CASE WHEN vs.visit_date = kst_now.today_kst THEN vs.visit_count ELSE 0 END), 0) as 오늘_방문자,
  kst_now.yesterday_kst as 어제날짜,
  COALESCE(SUM(CASE WHEN vs.visit_date = kst_now.yesterday_kst THEN vs.visit_count ELSE 0 END), 0) as 어제_방문자
FROM kst_now
CROSS JOIN visitor_stats vs
WHERE vs.visit_date >= kst_now.yesterday_kst - INTERVAL '1 day'
GROUP BY kst_now.now_kst, kst_now.today_kst, kst_now.yesterday_kst;

-- 3. 최근 7일 시간대별 데이터 확인
SELECT 
  '최근 7일 데이터' as 체크항목,
  visit_date as 날짜,
  visit_hour as 시간,
  visit_count as 방문수,
  created_at as 생성시각
FROM visitor_stats
WHERE visit_date >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '7 days'
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 50;

-- 4. visitor_stats_cache 테이블 확인
SELECT 
  '캐시 테이블 데이터' as 체크항목,
  cache_key,
  today as 오늘,
  yesterday as 어제,
  last_7_days as 최근7일,
  total_visits as 총방문,
  updated_at as 업데이트시각,
  NOW() - updated_at as 캐시나이
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 5. RPC 함수 존재 확인
SELECT 
  'RPC 함수 확인' as 체크항목,
  proname as 함수명,
  pg_get_function_identity_arguments(p.oid) as 파라미터
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN ('increment_visitor_stat', 'get_visitor_stats');

-- 6. 현재 UTC와 KST 시각 확인
SELECT 
  '현재 시각 비교' as 체크항목,
  NOW() as UTC시각,
  (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as KST시각,
  (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE as KST날짜;

-- 7. 테이블 스키마 확인
SELECT 
  '테이블 스키마' as 체크항목,
  column_name as 컬럼명,
  data_type as 데이터타입,
  is_nullable as NULL허용
FROM information_schema.columns
WHERE table_name = 'visitor_stats'
  AND table_schema = 'public'
ORDER BY ordinal_position;
