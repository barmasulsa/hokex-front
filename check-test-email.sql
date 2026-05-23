-- 테스트 이메일 확인
SELECT 
  email,
  created_at,
  updated_at
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 최근 동기화된 구독자 확인
SELECT 
  email,
  created_at,
  updated_at
FROM stibee_subscribers
ORDER BY created_at DESC
LIMIT 10;
