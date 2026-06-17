-- ============================================================
-- DATABASE SCHEMA ERROR 진단
-- ============================================================
-- 목적: 500 "Database error querying schema" 원인 확인
-- ============================================================

-- 1. user_profiles 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
) AS user_profiles_exists;

-- 2. user_profiles 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. user_profiles 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
OR trigger_name LIKE '%user%profile%';

-- 4. Auth 관련 트리거 확인 (auth.users에서 user_profiles 생성하는 트리거)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- 5. 관련 함수 확인
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%profile%';

-- 6. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 7. 실제 user_profiles 데이터 확인
SELECT COUNT(*) as total_profiles FROM user_profiles;

-- 8. stibee_subscribers 테이블 확인 (참조 무결성)
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='user_profiles';
