-- 1. 테스트 이메일 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at,
  updated_at
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 2. 최근 동기화된 구독자 확인 (최근 10명)
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at,
  updated_at
FROM stibee_subscribers
ORDER BY last_synced_at DESC NULLS LAST
LIMIT 10;

-- 3. 전체 구독자 수 확인
SELECT COUNT(*) as total_subscribers
FROM stibee_subscribers;

-- 4. 최근 1시간 내 동기화된 구독자 수
SELECT COUNT(*) as synced_last_hour
FROM stibee_subscribers
WHERE last_synced_at > NOW() - INTERVAL '1 hour';

-- 5. Cron Job 상태 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%stibee%';

-- 6. 최근 Edge Function 실행 로그 확인 (있다면)
-- 참고: 이 쿼리는 Supabase Dashboard의 Edge Functions > Logs에서 확인하는 것이 더 정확합니다
