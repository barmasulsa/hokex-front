-- ============================================
-- 스티비 구독자 실시간 동기화 설정
-- ============================================
-- 기능:
-- 1. 웹훅으로 실시간 동기화 (새 구독자 즉시 반영)
-- 2. 1분마다 자동 동기화 (백업용)
-- 3. 기존 구독자 전체 동기화
-- ============================================

-- 1단계: pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2단계: stibee_subscribers 테이블 생성
CREATE TABLE IF NOT EXISTS public.stibee_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_stibee_subscribers_email ON public.stibee_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_stibee_subscribers_last_synced ON public.stibee_subscribers(last_synced_at);

-- 3단계: RLS 정책 설정
ALTER TABLE public.stibee_subscribers ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read stibee_subscribers" ON public.stibee_subscribers;
DROP POLICY IF EXISTS "Service role can insert/update stibee_subscribers" ON public.stibee_subscribers;

-- 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read stibee_subscribers"
  ON public.stibee_subscribers
  FOR SELECT
  USING (true);

-- Service Role만 쓰기 가능
CREATE POLICY "Service role can insert/update stibee_subscribers"
  ON public.stibee_subscribers
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4단계: Cron Job 생성 (1분마다 자동 동기화)
SELECT cron.schedule(
  'sync-stibee-subscribers-every-1min',
  '* * * * *',  -- 1분마다 실행
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
SELECT COUNT(*) as subscriber_count FROM stibee_subscribers;
SELECT * FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-1min';

-- ============================================
-- 다음 단계:
-- ============================================
-- 1. Edge Functions 환경 변수 설정 (STIBEE_API_KEY, STIBEE_LIST_ID)
-- 2. 스티비 웹훅 설정 (아래 가이드 참조)
-- 3. 수동 동기화로 기존 구독자 가져오기
-- ============================================
