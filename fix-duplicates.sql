-- HOKEX 중복 행사 제거 스크립트
-- 같은 제목과 날짜를 가진 행사 중 가장 오래된 것만 남기고 나머지 삭제

-- 1단계: 중복 행사 확인 (실행 전 확인용)
SELECT title, start_date, end_date, COUNT(*) as duplicate_count
FROM events
GROUP BY title, start_date, end_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2단계: 중복 행사 삭제 (created_at이 가장 오래된 것만 남김)
DELETE FROM events a
USING events b
WHERE a.id > b.id
  AND a.title = b.title
  AND a.start_date = b.start_date
  AND a.end_date = b.end_date;

-- 3단계: 중복 방지를 위한 유니크 인덱스 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique_title_dates 
ON events(title, start_date, end_date);

-- 4단계: 결과 확인
SELECT COUNT(*) as total_events FROM events;
SELECT title, start_date, end_date, COUNT(*) as count
FROM events
GROUP BY title, start_date, end_date
ORDER BY title;
