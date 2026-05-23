-- 테스트 이메일 즉시 추가 (가장 빠른 해결)
INSERT INTO stibee_subscribers (email, subscribed_at, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET 
  last_synced_at = NOW(),
  updated_at = NOW();

-- 확인
SELECT * FROM stibee_subscribers WHERE email = 'lcw7914875@gmail.com';
