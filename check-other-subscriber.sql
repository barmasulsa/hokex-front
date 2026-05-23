-- 다른 구독자 확인
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. 시도한 이메일이 뭔지 알려주세요 (여기에 입력)
-- 예: test@example.com

-- 2. 해당 이메일이 DB에 있는지 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at,
  NOW() - last_synced_at as "동기화_후_경과시간"
FROM stibee_subscribers
WHERE email = 'YOUR_EMAIL_HERE';  -- 여기에 시도한 이메일 입력

-- 3. 전체 구독자 목록 확인 (최근 10명)
SELECT 
  email,
  last_synced_at,
  NOW() - last_synced_at as "동기화_후_경과시간"
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;

-- 4. Cron Job 최근 실행 기록 확인
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as "실행_시간"
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-1min')
ORDER BY start_time DESC
LIMIT 5;

-- 5. 최근 1분 내 동기화된 구독자 수
SELECT 
  COUNT(*) as "최근_1분_내_동기화된_구독자"
FROM stibee_subscribers
WHERE last_synced_at > NOW() - INTERVAL '1 minute';

-- 6. 전체 구독자 수
SELECT COUNT(*) as "총_구독자_수"
FROM stibee_subscribers;
