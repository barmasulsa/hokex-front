-- Stibee 동기화 완전 초기화 및 재설정
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
  -- 모든 stibee 관련 Cron Job 삭제
  PERFORM cron.unschedule('stibee-sync-1min');
  PERFORM cron.unschedule('stibee-sync-5min');
  PERFORM cron.unschedule('stibee-sync-hourly');
  PERFORM cron.unschedule('stibee-sync-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 확인: Cron Job이 모두 삭제되었는지 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%stibee%';

-- 예상 결과: 빈 결과 (아무것도 없어야 함)

-- ============================================
-- 2단계: 기존 구독자 데이터 확인 (삭제하지 않음)
-- ============================================

-- 현재 구독자 수 확인
SELECT COUNT(*) as "현재_구독자_수" FROM stibee_subscribers;

-- 최근 동기화 상태 확인
SELECT 
  COUNT(*) as "구독자_수",
  MAX(last_synced_at) as "마지막_동기화_시간",
  NOW() - MAX(last_synced_at) as "경과_시간"
FROM stibee_subscribers;

-- ============================================
-- 3단계: 새로운 5분 주기 Cron Job 생성
-- ============================================

-- 5분 주기로 자동 동기화 (운영 환경에 적합)
SELECT cron.schedule(
  'stibee-sync-5min',
  '*/5 * * * *', -- 5분마다 실행
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

-- 확인: 새 Cron Job이 생성되었는지 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'stibee-sync-5min';

-- 예상 결과:
-- jobname: stibee-sync-5min
-- schedule: */5 * * * *
-- active: true

-- ============================================
-- 4단계: 즉시 수동 동기화 실행
-- ============================================

-- Edge Function 수동 실행 (첫 동기화)
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  ) as request_id;

-- 위 쿼리 실행 후 30초 대기

-- ============================================
-- 5단계: 동기화 결과 확인
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
  end_time,
  end_time - start_time as "실행_시간"
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
-- 3. DB에 자동으로 저장됨
-- 4. 구독자는 최대 5분 후 웹사이트 로그인 가능

-- 테스트 방법:
-- 1. Stibee에서 새 이메일로 구독
-- 2. 5분 대기
-- 3. 웹사이트에서 해당 이메일로 로그인 시도

-- 참고:
-- - 기존 구독자 데이터는 삭제되지 않고 유지됩니다
-- - last_synced_at 값만 업데이트됩니다
