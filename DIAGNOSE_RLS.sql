-- 현재 정책 상세 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd, policyname;
