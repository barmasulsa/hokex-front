-- ============================================
-- 방문자 통계 캐시 자동 업데이트 설정
-- ============================================
-- 이 SQL을 Supabase Dashboard SQL Editor에서 실행하세요
-- 그러면 30분마다 자동으로 캐시가 업데이트됩니다

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
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
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
  active
FROM cron.job 
WHERE jobname = 'update-visitor-cache-every-30min';

-- ⚠️ 주의: 위 SQL의 URL과 API KEY를 실제 값으로 변경해야 합니다
-- Supabase Dashboard > Settings > API에서 확인 가능
