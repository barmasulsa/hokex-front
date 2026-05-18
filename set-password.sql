-- lcw5525@naver.com 계정의 비밀번호를 "5525"로 설정
-- Supabase Dashboard → SQL Editor에서 실행하세요

UPDATE auth.users
SET encrypted_password = crypt('5525', gen_salt('bf'))
WHERE email = 'lcw5525@naver.com';

-- 확인: 업데이트된 사용자 정보 조회
SELECT 
  id,
  email,
  created_at,
  updated_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'lcw5525@naver.com';
