-- visitor_stats_cache 테이블의 실제 컬럼 확인

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats_cache'
ORDER BY ordinal_position;
