-- ============================================
-- 🔐 sadpandadayo@gmail.com Auth 계정 수동 생성
-- ============================================
-- 주의: pgcrypto 확장이 필요합니다!
-- 
-- 이 방법은 SQL로 직접 계정을 만듭니다.
-- 더 안전한 방법: 로그인 페이지에서 "비밀번호 찾기" 사용

-- STEP 1: pgcrypto 확장 활성화 (이미 있으면 무시됨)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: Auth 계정 생성 (비밀번호: hokex2026)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sadpandadayo@gmail.com',
  crypt('hokex2026', gen_salt('bf')),  -- bcrypt 암호화
  NOW(),  -- 이메일 확인됨
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;  -- 이미 있으면 건너뜀

-- STEP 3: user_profiles 자동 생성 확인
-- (트리거가 자동으로 생성해야 함)

-- STEP 4: 확인
SELECT 
  '✅ Auth 계정 생성 완료' as status,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'sadpandadayo@gmail.com';

-- ✅ 이제 로그인 가능합니다!
-- 이메일: sadpandadayo@gmail.com
-- 비밀번호: hokex2026
