-- Stibee 동기화 결과 확인

-- 1. 전체 구독자 수 (중복 제거)
SELECT COUNT(DISTINCT email) as unique_subscribers 
FROM stibee_subscribers;

-- 2. 최근 동기화 시간
SELECT MAX(last_synced_at) as last_sync_time 
FROM stibee_subscribers;

-- 3. 관리자 이메일 확인
SELECT email, last_synced_at 
FROM stibee_subscribers 
WHERE email IN ('lcw5525@naver.com', 'ojwkey@naver.com')
ORDER BY email;

-- 4. 샘플 데이터 확인 (최근 10명)
SELECT email, subscribed_at, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;
