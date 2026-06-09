-- visitor_logs 테이블 스키마 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'visitor_logs'
ORDER BY ordinal_position;
