-- COEX가 아닌 기타 전시장 행사 삭제
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 삭제 전 확인
SELECT id, title, venue, start_date, end_date
FROM events
WHERE venue NOT ILIKE '%coex%' 
  AND venue NOT ILIKE '%코엑스%'
ORDER BY start_date;

-- 삭제 실행 (위 쿼리로 확인 후 실행)
DELETE FROM events
WHERE venue NOT ILIKE '%coex%' 
  AND venue NOT ILIKE '%코엑스%';

-- 삭제 후 확인
SELECT COUNT(*) as total_events FROM events;
SELECT venue, COUNT(*) as count 
FROM events 
GROUP BY venue 
ORDER BY count DESC;
