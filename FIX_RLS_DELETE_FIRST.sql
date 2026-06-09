-- ==========================================
-- RLS 정책 완전 초기화 및 재생성
-- ==========================================

-- 1단계: 기존 정책 전부 삭제
DROP POLICY IF EXISTS "Allow read access to all non-deleted events" ON events;
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "Allow public read access to non-deleted events" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;

-- 2단계: 새로운 정책 생성 (deleted_at이 NULL인 것만 조회)
CREATE POLICY "Allow read access to all non-deleted events"
ON events
FOR SELECT
USING (
  deleted_at IS NULL
);

-- 3단계: RLS 활성화 확인
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 4단계: 확인 쿼리
SELECT 
  id,
  title,
  deleted_at,
  venue,
  start_date
FROM events 
WHERE id = '0404750f-302c-456b-a5fe-433486610edf';

-- 5단계: 전체 이벤트 개수 확인
SELECT COUNT(*) as total_events
FROM events
WHERE deleted_at IS NULL;
