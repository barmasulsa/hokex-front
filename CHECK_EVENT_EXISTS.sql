-- 해당 이벤트가 존재하는지, deleted_at 상태는 어떤지 확인

-- 1. 이벤트 존재 여부 및 deleted_at 확인
SELECT 
  id, 
  title, 
  deleted_at,
  venue,
  start_date,
  end_date
FROM events
WHERE id = '0404750f-302c-456b-a5fe-433486610edf';

-- 2. 현재 적용된 SELECT RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual::text as using_expression,
  with_check::text
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT'
ORDER BY policyname;

-- 3. RLS가 활성화되어 있는지 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'events';
