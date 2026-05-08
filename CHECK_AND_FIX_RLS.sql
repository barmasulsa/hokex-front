-- 1단계: 현재 정책 확인
SELECT 
  policyname, 
  cmd, 
  roles::text, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd, policyname;

-- 2단계: RLS 상태 확인
SELECT 
  schemaname,
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';

-- 3단계: 모든 SELECT 정책 삭제
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'events' AND cmd = 'SELECT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON events';
    END LOOP;
END $$;

-- 4단계: 새로운 SELECT 정책 생성
CREATE POLICY "public_select_all"
ON events
FOR SELECT
TO public
USING (true);

-- 5단계: 확인
SELECT 
  policyname, 
  cmd, 
  roles::text,
  qual
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';
