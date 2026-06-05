-- ============================================
-- 가장 간단한 테이블 확인
-- ============================================

-- 1. visitor_stats 테이블이 존재하는지 확인
SELECT EXISTS (
  SELECT 1 
  FROM pg_tables 
  WHERE tablename = 'visitor_stats'
) as table_exists;

-- 2. 만약 테이블이 존재하면, 직접 SELECT 해보기
SELECT * FROM visitor_stats LIMIT 1;

-- 3. RPC 함수 존재 확인
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'increment_visitor_stat'
) as function_exists;
