-- visitor_stats 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats'
ORDER BY ordinal_position;

-- 샘플 데이터 확인
SELECT * FROM visitor_stats
ORDER BY created_at DESC
LIMIT 5;
