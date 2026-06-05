-- 새로운 테스트용 OTP 코드 생성
-- Supabase Dashboard → SQL Editor에서 실행

-- 1. 새로운 10분 유효 OTP 코드 생성
INSERT INTO email_verification_codes (email, code, expires_at, ip_address)
VALUES ('lcw7914875@gmail.com', '888888', NOW() + INTERVAL '10 minutes', 'manual-test')
RETURNING 
  id, 
  code, 
  created_at,
  expires_at,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 60, 1) as minutes_until_expiry;

-- 2. 생성 후 바로 확인
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
    ELSE '사용 가능 ✓'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 60, 1) as minutes_left
FROM email_verification_codes
WHERE email = 'lcw7914875@gmail.com'
  AND code = '888888'
ORDER BY created_at DESC
LIMIT 1;
