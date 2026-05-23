-- 1분 주기 자동 동기화 설정
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. 기존 Cron Job 삭제 (있다면) - 에러 무시
DO $$
BEGIN
  PERFORM cron.unschedule('stibee-sync-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('stibee-sync-1min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. 1분 주기 Cron Job 생성
SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *', -- 매분 실행
  $$
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  );
  $$
);

-- 3. 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'stibee-sync-1min';

-- 예상 결과:
-- jobname: stibee-sync-1min
-- schedule: * * * * *
-- active: true
