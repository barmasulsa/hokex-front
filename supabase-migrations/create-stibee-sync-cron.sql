-- Stibee 구독자 자동 동기화 Cron Job 설정
-- 매 시간마다 자동 실행

-- pg_cron extension 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 Cron Job 삭제 (있다면)
SELECT cron.unschedule('stibee-sync-hourly');

-- 매 시간 정각에 동기화
SELECT cron.schedule(
  'stibee-sync-hourly',
  '0 * * * *', -- 매 시간 0분 (예: 1:00, 2:00, 3:00...)
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
SELECT * FROM cron.job WHERE jobname = 'stibee-sync-hourly';
