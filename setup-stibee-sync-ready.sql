-- Stibee 동기화 설정 (실행 준비 완료)
-- Supabase Dashboard > SQL Editor에서 실행

-- ============================================
-- 0단계: pg_net extension 활성화 (필수)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 1단계: 기존 Cron Job 모두 삭제
-- ============================================

DO $$
BEGIN
  PERFORM cron.unschedule('stibee-sync-1min');
  PERFORM cron.unschedule('stibee-sync-5min');
  PERFORM cron.unschedule('stibee-sync-hourly');
  PERFORM cron.unschedule('stibee-sync-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================
-- 2단계: 현재 구독자 데이터 확인
-- ============================================

SELECT COUNT(*) as "현재_구독자_수" FROM stibee_subscribers;

-- ============================================
-- 3단계: 5분 주기 Cron Job 생성
-- ============================================

SELECT cron.schedule(
  'stibee-sync-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg'
    ),
    body:='{}'::jsonb
  );
  $$
);

-- ============================================
-- 4단계: Cron Job 확인
-- ============================================

SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'stibee-sync-5min';

-- ============================================
-- 5단계: 수동 동기화 실행 (테스트)
-- ============================================

SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg'
    ),
    body:='{}'::jsonb
  ) as request_id;

-- 위 쿼리 실행 후 30초 대기

-- ============================================
-- 6단계: 동기화 결과 확인
-- ============================================

-- 전체 구독자 수 확인
SELECT COUNT(*) as "총_구독자_수"
FROM stibee_subscribers;

-- 최근 동기화된 구독자 10명 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  NOW() - last_synced_at as "동기화_후_경과시간"
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;

-- Cron Job 실행 기록 확인
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-5min')
ORDER BY start_time DESC
LIMIT 5;

-- ============================================
-- 완료!
-- ============================================

-- 이제 다음과 같이 작동합니다:
-- 1. 매 5분마다 자동으로 Stibee에서 구독자 목록을 가져옴
-- 2. 기존 구독자는 유지되고, 새 구독자만 추가됨 (upsert)
-- 3. 구독자는 최대 5분 후 웹사이트 로그인 가능
