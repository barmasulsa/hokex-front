-- HTTP 406 에러 해결: events 테이블 RLS 정책 수정

-- 1. 기존 SELECT 정책 확인 및 삭제 (있다면)
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;

-- 2. 새로운 SELECT 정책 생성 (모든 사용자가 deleted_at이 NULL인 이벤트 조회 가능)
CREATE POLICY "Enable read access for all users"
ON events
FOR SELECT
USING (deleted_at IS NULL);

-- 3. 정책 확인
SELECT 
  policyname,
  cmd,
  qual::text as using_expression
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';
