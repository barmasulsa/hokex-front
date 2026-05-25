-- 현재 로그인한 사용자의 닉네임 확인
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 user_profiles 데이터 확인 (닉네임이 있는 사용자만)
SELECT 
  id,
  nickname,
  created_at,
  updated_at
FROM user_profiles
WHERE nickname IS NOT NULL
ORDER BY created_at DESC;

-- 2. 특정 이메일로 검색 (본인 이메일로 변경하세요)
-- SELECT 
--   up.id,
--   up.nickname,
--   au.email,
--   up.created_at
-- FROM user_profiles up
-- JOIN auth.users au ON up.id = au.id
-- WHERE au.email = 'YOUR_EMAIL@example.com';

-- 3. RLS 정책 확인
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

-- 4. 현재 세션의 사용자 ID 확인
SELECT auth.uid() as current_user_id;

-- 5. 현재 사용자의 프로필 확인 (RLS 적용됨)
SELECT 
  id,
  nickname,
  created_at,
  updated_at
FROM user_profiles
WHERE id = auth.uid();
