-- ============================================
-- 긴급 RLS 수정: 기존 정책 삭제 후 재생성
-- ============================================

-- 1단계: 기존 SELECT 정책 모두 삭제
DROP POLICY IF EXISTS "Allow read access to all non-deleted events" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Allow public read access to non-deleted events" ON events;

-- 2단계: 새로운 단순 정책 생성
CREATE POLICY "allow_public_read_non_deleted"
ON events
FOR SELECT
USING (deleted_at IS NULL);

-- 3단계: 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'events'
AND cmd = 'SELECT';
