-- ============================================
-- 방문자 통계 캐시 자동 업데이트 Cron Job 설정
-- ============================================

-- 1. 기존 cron job 삭제 (있다면)
SELECT cron.unschedule('update-visitor-cache-every-30min');

-- 2. 30분마다 실행되는 cron job 생성
-- 매 시간 00분, 30분에 Edge Function 호출
SELECT cron.schedule(
  'update-visitor-cache-every-30min',
  '0,30 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://kcqxqxqxqxqxqxqxqx.supabase.co/functions/v1/update-visitor-stats-cache',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('type', 'today')
    ) AS request_id;
  $$
);

-- 3. 설정 확인
SELECT 
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'update-visitor-cache-every-30min';

-- 참고: 새벽 4시 전체 업데이트는 별도로 설정 가능
-- SELECT cron.schedule(
--   'update-visitor-cache-daily',
--   '0 4 * * *', -- 매일 새벽 4시
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://kcqxqxqxqxqxqxqxqx.supabase.co/functions/v1/update-visitor-stats-cache',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--       ),
--       body := jsonb_build_object('type', 'full')
--     ) AS request_id;
--   $$
-- );
