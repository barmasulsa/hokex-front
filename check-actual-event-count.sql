-- 실제 DB에 있는 행사 수 확인

-- 1. 전체 행사 수 (삭제되지 않은 것만)
SELECT COUNT(*) as total_events
FROM events
WHERE deleted_at IS NULL;

-- 2. 삭제된 행사 수
SELECT COUNT(*) as deleted_events
FROM events
WHERE deleted_at IS NOT NULL;

-- 3. 전체 행사 수 (삭제 포함)
SELECT COUNT(*) as all_events
FROM events;

-- 4. 최근 생성된 행사 10개 확인
SELECT id, title, venue, created_at
FROM events
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. venue별 행사 수
SELECT venue, COUNT(*) as count
FROM events
WHERE deleted_at IS NULL
GROUP BY venue
ORDER BY count DESC;
