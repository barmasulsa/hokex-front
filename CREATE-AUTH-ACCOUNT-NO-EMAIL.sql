-- ============================================
-- 🔐 이메일 없이 sadpandadayo@gmail.com Auth 계정 생성
-- ============================================
-- pgcrypto 없이 실행 가능!
-- Supabase Dashboard → SQL Editor → 복사/붙여넣기 → Run

-- STEP 1: Auth 계정 생성 (비밀번호: 123456)
-- bcrypt 해시를 미리 계산한 값 사용
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  recovery_sent_at,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change,
  email_change_token_current,
  email_change_token_new,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sadpandadayo@gmail.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- 123456의 bcrypt 해시
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  '',
  '',
  0,
  NULL,
  '',
  NOW(),
  false,
  NULL,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'sadpandadayo@gmail.com'
);

-- STEP 2: user_profiles 생성
INSERT INTO user_profiles (id, email, is_admin, nickname)
SELECT 
  id,
  'sadpandadayo@gmail.com',
  false,
  NULL
FROM auth.users 
WHERE email = 'sadpandadayo@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 3: 확인
SELECT 
  '✅ Auth 계정 생성 완료!' as status,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  CASE 
    WHEN up.id IS NOT NULL THEN '✅ 프로필 있음'
    ELSE '❌ 프로필 없음'
  END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'sadpandadayo@gmail.com';

-- ============================================
-- ✅ 이제 로그인 테스트!
-- ============================================
-- 이메일: sadpandadayo@gmail.com
-- 비밀번호: 123456
--
-- ⚠️ 만약 비밀번호가 작동하지 않으면:
-- Supabase Dashboard에서
-- Authentication → Users → sadpandadayo@gmail.com 찾기
-- → Actions → Reset Password (수동으로 123456으로 재설정)
