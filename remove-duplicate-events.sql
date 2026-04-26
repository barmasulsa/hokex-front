-- HOKEX 중복 행사 데이터 제거
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 중복 데이터 확인
SELECT title, venue, start_date, COUNT(*) as count
FROM events
GROUP BY title, venue, start_date
HAVING COUNT(*) > 1;

-- 2. 중복 데이터 삭제 (가장 오래된 것만 남기고 나머지 삭제)
DELETE FROM events
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY title, venue, start_date 
             ORDER BY created_at ASC
           ) as row_num
    FROM events
  ) t
  WHERE row_num > 1
);

-- 3. 삭제 후 확인
SELECT COUNT(*) as total_events FROM events;
SELECT title, venue, start_date FROM events ORDER BY start_date;
