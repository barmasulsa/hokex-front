-- 1분 주기 자동 동기화 작동 확인
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. Cron Job 상태 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'stibee-sync-1min';

-- 예상 결과:
-- jobname: stibee-sync-1min
-- schedule: * * * * *
-- active: true

-- 2. 최근 동기화 실행 기록 확인
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-1min')
ORDER BY start_time DESC
LIMIT 5;

-- 3. 테스트 이메일 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  NOW() - last_synced_at as "동기화된_지_얼마나_됐는지"
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 예상 결과:
-- email: lcw7914875@gmail.com
-- last_synced_at: (최근 시간, 1분 이내)
-- 동기화된_지_얼마나_됐는지: 00:00:XX (1분 이내)

-- 4. 전체 구독자 수 확인
SELECT 
  COUNT(*) as "총_구독자_수",
  MAX(last_synced_at) as "마지막_동기화_시간",
  NOW() - MAX(last_synced_at) as "마지막_동기화_후_경과시간"
FROM stibee_subscribers;

-- 5. 최근 1분 내 동기화된 구독자 수
SELECT 
  COUNT(*) as "최근_1분_내_동기화된_구독자"
FROM stibee_subscribers
WHERE last_synced_at > NOW() - INTERVAL '1 minute';
