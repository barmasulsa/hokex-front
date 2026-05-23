-- 동기화 결과 확인
SELECT COUNT(*) as total_subscribers FROM stibee_subscribers;

-- 최근 동기화된 구독자 10명
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;

-- 테스트 이메일 확인
SELECT email, subscribed_at, last_synced_at 
FROM stibee_subscribers 
WHERE email = 'lcw7914875@gmail.com';
