-- 단계별로 실행하세요

-- 1단계: 현재 정책 확인
SELECT policyname FROM pg_policies WHERE tablename = 'events';

-- 2단계: 읽기 정책만 수정 (가장 중요!)
-- 기존 읽기 정책 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Allow public read access to all events" ON events;

-- 3단계: 새로운 읽기 정책 생성 (모든 사용자가 모든 행을 볼 수 있음)
CREATE POLICY "public_read_all_events"
ON events
FOR SELECT
TO public
USING (true);

-- 4단계: 확인
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';
