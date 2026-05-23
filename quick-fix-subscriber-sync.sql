-- ========================================
-- 구독자 동기화 문제 빠른 해결 스크립트
-- ========================================

-- 1. 현재 상태 확인
SELECT '=== 1. 테스트 이메일 확인 ===' as step;
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 2. Cron Job 상태 확인
SELECT '=== 2. Cron Job 상태 ===' as step;
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%stibee%';

-- 3. 최근 동기화 현황
SELECT '=== 3. 최근 동기화 현황 ===' as step;
SELECT 
  COUNT(*) as total_subscribers,
  MAX(last_synced_at) as last_sync_time,
  COUNT(CASE WHEN last_synced_at > NOW() - INTERVAL '1 hour' THEN 1 END) as synced_last_hour
FROM stibee_subscribers;

-- ========================================
-- 해결 방법 1: 수동 동기화 즉시 실행
-- ========================================
-- 주석을 제거하고 실행하세요:

/*
SELECT '=== 해결 방법 1: 수동 동기화 실행 ===' as step;

-- Edge Function 직접 호출 (Supabase Dashboard의 Edge Functions 페이지에서 실행하는 것을 권장)
-- 또는 아래 명령을 터미널에서 실행:
-- curl -X POST https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json"

-- 1분 대기 후 다시 확인하세요!
*/

-- ========================================
-- 해결 방법 2: 1분 주기 Cron Job 설정
-- ========================================
-- 주석을 제거하고 실행하세요:

/*
-- 기존 Cron Job 삭제
SELECT cron.unschedule('stibee-sync-hourly');
SELECT cron.unschedule('stibee-sync-1min');

-- 1분 주기 Cron Job 생성
SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *', -- 매분 실행
  $$
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'stibee-sync-1min';
*/

-- ========================================
-- 해결 방법 3: 테스트 이메일 수동 추가 (긴급)
-- ========================================
-- 주석을 제거하고 실행하세요:

/*
INSERT INTO stibee_subscribers (email, subscribed_at, last_synced_at)
VALUES (
  'lcw7914875@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

-- 확인
SELECT * FROM stibee_subscribers WHERE email = 'lcw7914875@gmail.com';
*/
