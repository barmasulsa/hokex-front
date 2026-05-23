-- ============================================
-- 스티비 구독자 동기화 완전 새로 설정
-- ============================================
-- 실행 전 확인사항:
-- 1. Supabase Dashboard → SQL Editor에서 실행
-- 2. 기존 스티비 관련 테이블/함수/Cron Job 모두 삭제된 상태
-- 3. Edge Functions 환경 변수 설정 필요 (아래 참조)
-- ============================================

-- 1단계: pg_net 확장 활성화 (Cron Job에 필요)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2단계: stibee_subscribers 테이블 생성
CREATE TABLE IF NOT EXISTS public.stibee_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_stibee_subscribers_email ON public.stibee_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_stibee_subscribers_last_synced ON public.stibee_subscribers(last_synced_at);

-- 3단계: RLS (Row Level Security) 정책 설정
ALTER TABLE public.stibee_subscribers ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (로그인 체크용)
CREATE POLICY "Anyone can read stibee_subscribers"
  ON public.stibee_subscribers
  FOR SELECT
  USING (true);

-- Service Role만 쓰기 가능 (Edge Function용)
CREATE POLICY "Service role can insert/update stibee_subscribers"
  ON public.stibee_subscribers
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4단계: Cron Job 생성 (5분마다 자동 동기화)
SELECT cron.schedule(
  'sync-stibee-subscribers-every-5min',
  '*/5 * * * *',  -- 5분마다 실행
  $$
  SELECT
    net.http_post(
      url := 'https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 설정 완료! 
-- ============================================

-- 확인 쿼리:
-- 1. 테이블 확인
SELECT COUNT(*) as subscriber_count FROM stibee_subscribers;

-- 2. Cron Job 확인
SELECT * FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-5min';

-- 3. 최근 동기화된 구독자 확인
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;

-- ============================================
-- 다음 단계: Edge Functions 환경 변수 설정
-- ============================================
-- Supabase Dashboard에서 설정 필요:
-- 
-- 1. Edge Functions → sync-stibee-subscribers → Settings
-- 2. Secrets 섹션에서 다음 추가:
--    - STIBEE_API_KEY: [Stibee API 키]
--    - STIBEE_LIST_ID: [Stibee 리스트 ID]
--
-- 3. Edge Functions → check-stibee-subscriber → Settings
-- 4. Secrets 섹션에서 동일하게 추가:
--    - STIBEE_API_KEY: [Stibee API 키]
--    - STIBEE_LIST_ID: [Stibee 리스트 ID]
--
-- ============================================
-- 수동 동기화 테스트 (터미널에서 실행):
-- ============================================
-- curl -X POST \
--   https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
--   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
-- ============================================
