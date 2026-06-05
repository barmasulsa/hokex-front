-- OTP 코드 상태 확인
-- Supabase Dashboard → SQL Editor에서 실행

-- 1. 최근 생성된 OTP 코드 확인 (최근 10개)
SELECT 
  id,
  email,
  code,
  created_at,
  expires_at,
  used_at,
  CASE 
    WHEN used_at IS NOT NULL THEN '이미 사용됨'
    WHEN expires_at < NOW() THEN '만료됨'
    ELSE '사용 가능'
  END as status,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 as minutes_until_expiry
FROM email_verification_codes
WHERE email = 'lcw7914875@gmail.com'
ORDER BY created_at DESC
LIMIT 10;

-- 2. 사용 가능한 코드만 확인
SELECT 
  code,
  created_at,
  expires_at,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 60, 1) as minutes_left
FROM email_verification_codes
WHERE email = 'lcw7914875@gmail.com'
  AND used_at IS NULL
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- 3. Auth 사용자 존재 확인
-- (이 쿼리는 실패할 수 있음 - auth.users는 직접 접근 불가)
-- 대신 Dashboard → Authentication → Users에서 확인하세요
