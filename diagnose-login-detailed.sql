-- 상세 로그인 문제 진단 SQL
-- 실제 사용자 이메일로 테스트해주세요

-- ============================================
-- 1. 전체 테이블 상태 확인
-- ============================================
SELECT 
  'Table Status' as check_type,
  (SELECT COUNT(*) FROM public.stibee_subscribers) as stibee_count,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM auth.users WHERE encrypted_password IS NOT NULL AND encrypted_password != '') as users_with_password,
  (SELECT COUNT(*) FROM public.user_profiles) as profiles_count;

-- ============================================
-- 2. 특정 이메일 진단 (여기에 테스트 이메일 입력)
-- ============================================
WITH test_email AS (
  SELECT 'YOUR_EMAIL_HERE' as email  -- ⚠️ 여기를 실제 이메일로 변경
)

-- 2-1. Stibee 구독자 확인
SELECT 
  '1. Stibee Subscriber Check' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.stibee_subscribers WHERE email = (SELECT email FROM test_email))
    THEN '✅ 구독자임'
    ELSE '❌ 구독자 아님'
  END as status,
  COALESCE(
    (SELECT to_char(last_synced_at, 'YYYY-MM-DD HH24:MI:SS') FROM public.stibee_subscribers WHERE email = (SELECT email FROM test_email)), 
    'N/A'
  ) as info
FROM test_email

UNION ALL

-- 2-2. Auth 계정 존재 확인
SELECT 
  '2. Auth Account Check' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = (SELECT email FROM test_email))
    THEN '✅ Auth 계정 있음'
    ELSE '❌ Auth 계정 없음'
  END as status,
  COALESCE(
    (SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') FROM auth.users WHERE email = (SELECT email FROM test_email)), 
    'N/A'
  ) as info
FROM test_email

UNION ALL

-- 2-3. 비밀번호 설정 확인
SELECT 
  '3. Password Status' as step,
  CASE 
    WHEN (SELECT encrypted_password FROM auth.users WHERE email = (SELECT email FROM test_email)) IS NULL
    THEN '❌ 비밀번호 없음 (NULL)'
    WHEN (SELECT encrypted_password FROM auth.users WHERE email = (SELECT email FROM test_email)) = ''
    THEN '❌ 비밀번호 빈 문자열'
    ELSE '✅ 비밀번호 설정됨'
  END as status,
  COALESCE((SELECT LENGTH(encrypted_password)::text || ' bytes' FROM auth.users WHERE email = (SELECT email FROM test_email)), 'N/A') as info
FROM test_email

UNION ALL

-- 2-4. 비밀번호 '123456' 검증
SELECT 
  '4. Password 123456 Verify' as step,
  CASE 
    WHEN (SELECT crypt('123456', encrypted_password) = encrypted_password FROM auth.users WHERE email = (SELECT email FROM test_email))
    THEN '✅ 123456 비밀번호 맞음'
    ELSE '❌ 123456 비밀번호 틀림 또는 계정 없음'
  END as status,
  'N/A' as info
FROM test_email

UNION ALL

-- 2-5. 이메일 확인 상태
SELECT 
  '5. Email Confirmed Status' as step,
  CASE 
    WHEN (SELECT email_confirmed_at FROM auth.users WHERE email = (SELECT email FROM test_email)) IS NOT NULL
    THEN '✅ 이메일 확인됨'
    ELSE '❌ 이메일 미확인'
  END as status,
  COALESCE(
    (SELECT to_char(email_confirmed_at, 'YYYY-MM-DD HH24:MI:SS') FROM auth.users WHERE email = (SELECT email FROM test_email)), 
    'N/A'
  ) as info
FROM test_email

UNION ALL

-- 2-6. User Profile 확인
SELECT 
  '6. User Profile Check' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE email = (SELECT email FROM test_email))
    THEN '✅ Profile 있음'
    ELSE '❌ Profile 없음'
  END as status,
  COALESCE((SELECT id::text FROM public.user_profiles WHERE email = (SELECT email FROM test_email)), 'N/A') as info
FROM test_email;

-- ============================================
-- 3. 최근 생성된 Auth 계정 확인 (마지막 5개)
-- ============================================
SELECT 
  'Recent Auth Accounts' as type,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  LENGTH(encrypted_password) as password_length
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 4. Auth 설정 확인
-- ============================================
-- Auth 설정은 Supabase Dashboard에서 확인하세요:
-- Supabase Dashboard → Authentication → Settings
-- 확인 항목:
--   - Enable email confirmations (이메일 확인 필수 여부)
--   - SMTP settings (이메일 발송 설정)
--   - Disable email signups (회원가입 차단 여부)

SELECT '4. Auth Settings' as note, 'Check Supabase Dashboard > Authentication > Settings' as instruction;

