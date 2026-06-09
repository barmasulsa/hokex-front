-- 방문자 카운터 테이블이 제대로 생성되었는지 확인

-- 1. 테이블 존재 여부 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('visitor_sites', 'visitor_logs', 'visitor_dedup')
ORDER BY table_name;

-- 2. 각 테이블의 컬럼 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('visitor_sites', 'visitor_logs', 'visitor_dedup')
ORDER BY table_name, ordinal_position;

-- 3. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('visitor_sites', 'visitor_logs', 'visitor_dedup')
ORDER BY tablename, policyname;

-- 4. 인덱스 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('visitor_sites', 'visitor_logs', 'visitor_dedup')
ORDER BY tablename, indexname;
