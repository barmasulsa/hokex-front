-- 로그인 문제 디버깅
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. 테스트 이메일이 DB에 있는지 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 2. 대소문자 구분 없이 검색
SELECT 
  email,
  subscribed_at,
  last_synced_at
FROM stibee_subscribers
WHERE LOWER(email) = LOWER('lcw7914875@gmail.com');

-- 3. 전체 구독자 수 확인
SELECT COUNT(*) as total_subscribers
FROM stibee_subscribers;

-- 4. 최근 동기화된 구독자 확인
SELECT 
  email,
  last_synced_at,
  NOW() - last_synced_at as "동기화_후_경과시간"
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 5;

-- 5. Cron Job 상태 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%stibee%';

-- 6. 최근 Cron Job 실행 기록
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-1min')
ORDER BY start_time DESC
LIMIT 3;

-- 7. stibee_subscribers 테이블 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'stibee_subscribers';

-- 8. 테이블 권한 확인
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'stibee_subscribers';
