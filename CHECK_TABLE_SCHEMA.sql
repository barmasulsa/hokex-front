-- ============================================
-- visitor_stats 테이블 간단 확인
-- ============================================

-- 테이블 존재 확인
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'visitor_stats';

-- 컬럼 목록
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats';

-- 샘플 데이터 (첫 1개)
SELECT * FROM visitor_stats LIMIT 1;

-- 총 레코드 수
SELECT COUNT(*) as total_records FROM visitor_stats;
