-- 배너 테이블의 announcement_category 컬럼 상태 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'banners' 
  AND column_name = 'announcement_category';

-- 제약 조건 확인
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'banners'::regclass
  AND conname LIKE '%announcement_category%';

-- 기존 배너 데이터의 announcement_category 값 확인
SELECT 
  type,
  announcement_category,
  COUNT(*) as count
FROM banners
GROUP BY type, announcement_category
ORDER BY type, announcement_category;
