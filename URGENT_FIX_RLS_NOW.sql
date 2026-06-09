-- 긴급 수정: RLS 정책 즉시 수정
-- 실행 순서대로 진행하세요

-- ===============================================
-- 1단계: 현재 SELECT 정책 확인
-- ===============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual::text as using_expression
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT'
ORDER BY policyname;

-- ===============================================
-- 2단계: 모든 기존 SELECT 정책 삭제
-- ===============================================
-- 아래 정책들이 존재하면 모두 삭제합니다
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "public read all events" ON events;
DROP POLICY IF EXISTS "Allow anon users for crawler" ON events;
DROP POLICY IF EXISTS "Allow authenticated users" ON events;
DROP POLICY IF EXISTS "Admin can view deleted events" ON events;

-- ===============================================
-- 3단계: 새로운 통합 SELECT 정책 생성
-- ===============================================
-- 모든 사용자(익명 포함)가 deleted_at이 NULL인 행사만 조회 가능
CREATE POLICY "Allow read access to all non-deleted events"
ON events
FOR SELECT
TO public  -- 모든 사용자(authenticated + anon)
USING (deleted_at IS NULL);

-- ===============================================
-- 4단계: 정책 적용 확인
-- ===============================================
SELECT 
  policyname,
  cmd,
  qual::text as using_expression,
  roles::text
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';

-- ===============================================
-- 5단계: 특정 이벤트 조회 테스트
-- ===============================================
-- 해당 이벤트가 존재하는지 확인
SELECT id, title, deleted_at
FROM events
WHERE id = '0404750f-302c-456b-a5fe-433486610edf';
