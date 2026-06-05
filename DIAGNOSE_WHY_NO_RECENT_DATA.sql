-- ============================================
-- 왜 최근 17일 데이터가 없는지 진단
-- ============================================
-- DB에는 5월 18일까지만 데이터가 있음
-- 오늘은 6월 4일
-- 프론트엔드가 RPC 함수를 호출하지 않거나 실패하는 것으로 추정

-- 1. RPC 함수 권한 확인
SELECT 
  routine_name,
  routine_type,
  security_type,
  -- 실행 권한 확인
  has_function_privilege('anon', routine_schema || '.' || routine_name || '(date, integer)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', routine_schema || '.' || routine_name || '(date, integer)', 'EXECUTE') as authenticated_can_execute
FROM information_schema.routines
WHERE routine_name = 'increment_visitor_stat'
  AND routine_schema = 'public';

-- 2. RLS 정책 상세 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'visitor_stats'
ORDER BY policyname;

-- 3. 수동으로 RPC 함수 호출 테스트 (오늘 날짜)
SELECT increment_visitor_stat(CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER);

-- 4. 방금 추가된 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats 
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour DESC;

-- 5. 최근 7일간 시도된 데이터가 있는지 확인
SELECT 
  visit_date,
  COUNT(*) as hour_records,
  SUM(visit_count) as total_visits
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

