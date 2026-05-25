-- 닉네임 문제 진단 쿼리
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 로그인한 사용자 ID 확인
SELECT 
  auth.uid() as my_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as my_email;

-- 2. 내 프로필 데이터 확인 (RLS 적용됨)
SELECT 
  id,
  email,
  nickname,
  is_admin,
  created_at,
  updated_at
FROM user_profiles
WHERE id = auth.uid();

-- 3. RLS 없이 모든 프로필 확인 (관리자만 가능)
-- SELECT 
--   id,
--   email,
--   nickname,
--   is_admin,
--   created_at
-- FROM user_profiles
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 4. user_profiles 테이블의 RLS 정책 확인
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
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 5. user_profiles 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
