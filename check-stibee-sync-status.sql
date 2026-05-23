-- Stibee 동기화 현재 상태 확인

-- 1. Cron Job 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%stibee%'
ORDER BY jobname;

-- 2. 최근 구독자 확인 (최근 10명)
SELECT 
  email,
  subscribed_at,
  source,
  created_at
FROM stibee_subscribers
ORDER BY created_at DESC
LIMIT 10;

-- 3. 구독자 통계
SELECT 
  source,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stibee_subscribers
GROUP BY source
ORDER BY count DESC;

-- 4. 최근 1시간 내 추가된 구독자
SELECT 
  COUNT(*) as recent_subscribers,
  MAX(created_at) as last_added
FROM stibee_subscribers
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 5. Edge Function 환경 변수 확인 (간접 확인)
-- Supabase Dashboard → Edge Functions → sync-stibee-subscribers → Settings에서 확인 필요:
-- - STIBEE_API_KEY
-- - STIBEE_LIST_ID
