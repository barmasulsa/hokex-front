-- Supabase Cron Job 설정: 매일 자동으로 Stibee 구독자 동기화
-- 
-- 실행 방법:
-- 1. Supabase Dashboard → Database → Extensions
-- 2. "pg_cron" 활성화
-- 3. SQL Editor에서 아래 쿼리 실행

-- Cron Job 생성 (매일 새벽 2시 실행)
SELECT cron.schedule(
  'sync-stibee-daily',           -- Job 이름
  '0 2 * * *',                   -- 매일 새벽 2시 (한국 시간 기준 조정 필요)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-stibee-subscribers',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_ANON_KEY',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);

-- Cron Job 확인
SELECT * FROM cron.job;

-- Cron Job 삭제 (필요시)
-- SELECT cron.unschedule('sync-stibee-daily');

-- 실행 로그 확인
SELECT * FROM cron.job_run_details 
WHERE jobname = 'sync-stibee-daily' 
ORDER BY start_time DESC 
LIMIT 10;
