-- 기존 배너의 NULL announcement_category를 'homepage'로 업데이트
UPDATE banners
SET announcement_category = 'homepage'
WHERE announcement_category IS NULL;

-- 결과 확인
SELECT 
  type,
  announcement_category,
  COUNT(*) as count
FROM banners
GROUP BY type, announcement_category
ORDER BY type, announcement_category;
