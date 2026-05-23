-- Stibee 구독자 자동 동기화 주기를 1분으로 변경
-- 실시간에 가까운 동기화 제공

-- 기존 1시간 주기 Cron Job 삭제
SELECT cron.unschedule('stibee-sync-hourly');

-- 1분마다 동기화 (매분 0초)
SELECT cron.schedule(
  'stibee-sync-every-minute',
  '* * * * *', -- 매분 실행 (예: 1:00, 1:01, 1:02...)
  $$
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Cron Job 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'stibee-sync-every-minute';

-- 예상 결과:
-- jobname: stibee-sync-every-minute
-- schedule: * * * * * (매분)
-- active: true
