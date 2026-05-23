-- Stibee 동기화 간단 설정
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
-- 2단계: 현재 구독자 데이터 확인
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
-- 3단계: Service Role Key 확인
-- ============================================

-- 아래 명령어로 Service Role Key를 확인하세요:
-- Supabase Dashboard > Settings > API > service_role key (secret)
-- 
-- 복사한 키를 아래 'YOUR_SERVICE_ROLE_KEY_HERE'에 붙여넣으세요

-- ============================================
-- 4단계: 5분 주기 Cron Job 생성
-- ============================================

-- ⚠️ 주의: 아래 'YOUR_SERVICE_ROLE_KEY_HERE'를 실제 Service Role Key로 교체하세요!

SELECT cron.schedule(
  'stibee-sync-5min',
  '*/5 * * * *', -- 5분마다 실행
  $$
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
    ),
    body:='{}'::jsonb
  );
  $$
);

-- ============================================
-- 5단계: Cron Job 확인
-- ============================================

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
-- 6단계: 수동 동기화 실행 (테스트)
-- ============================================

-- ⚠️ 주의: 아래 'YOUR_SERVICE_ROLE_KEY_HERE'를 실제 Service Role Key로 교체하세요!

SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
    ),
    body:='{}'::jsonb
  ) as request_id;

-- 위 쿼리 실행 후 30초 대기

-- ============================================
-- 7단계: 동기화 결과 확인
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

-- 참고:
-- - 기존 구독자 데이터는 삭제되지 않고 유지됩니다
-- - last_synced_at 값만 업데이트됩니다
