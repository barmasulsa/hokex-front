-- visitor_logs 테이블 스키마 확인

-- 1. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'visitor_logs'
ORDER BY ordinal_position;

-- 2. 테이블에 실제 데이터가 있는지 확인
SELECT COUNT(*) as total_rows
FROM visitor_logs;

-- 3. 최근 데이터 샘플 확인
SELECT *
FROM visitor_logs
ORDER BY created_at DESC
LIMIT 5;
