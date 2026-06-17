-- 로그인 문제 진단 SQL
-- 사용자 이메일을 입력하여 진단

-- 1. 구독자 테이블 확인
SELECT 
  'stibee_subscribers 확인' as check_point,
  email,
  subscribed_at,
  created_at
FROM public.stibee_subscribers
WHERE email = 'YOUR_EMAIL_HERE'  -- 여기에 테스트 이메일 입력
LIMIT 1;

-- 2. Auth 계정 확인
SELECT 
  'auth.users 확인' as check_point,
  id,
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- 여기에 테스트 이메일 입력
LIMIT 1;

-- 3. 비밀번호 확인 (해시값이 있는지만 확인)
SELECT 
  'Password Hash 확인' as check_point,
  email,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ 비밀번호 없음'
    WHEN encrypted_password = '' THEN '❌ 비밀번호 빈 문자열'
    ELSE '✅ 비밀번호 설정됨'
  END as password_status,
  LENGTH(encrypted_password) as password_hash_length
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- 여기에 테스트 이메일 입력
LIMIT 1;

-- 4. User Profile 확인
SELECT 
  'user_profiles 확인' as check_point,
  id,
  email,
  is_admin,
  created_at
FROM public.user_profiles
WHERE email = 'YOUR_EMAIL_HERE'  -- 여기에 테스트 이메일 입력
LIMIT 1;

-- 5. 비밀번호 수동 테스트 (123456이 맞는지 확인)
SELECT 
  '비밀번호 검증' as check_point,
  email,
  crypt('123456', encrypted_password) = encrypted_password as password_matches_123456
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- 여기에 테스트 이메일 입력
LIMIT 1;

-- 6. 전체 통계
SELECT 
  '전체 통계' as info,
  (SELECT COUNT(*) FROM public.stibee_subscribers) as total_subscribers,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM auth.users WHERE encrypted_password IS NOT NULL AND encrypted_password != '') as users_with_password,
  (SELECT COUNT(*) FROM public.user_profiles) as total_profiles;
