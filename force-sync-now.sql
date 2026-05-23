-- 즉시 수동 동기화 실행
-- Supabase Dashboard > SQL Editor에서 실행

-- Edge Function 수동 실행 (즉시 동기화)
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  ) as request_id;

-- 실행 후 30초 대기한 다음 아래 쿼리로 확인

-- 동기화 결과 확인
SELECT 
  email,
  last_synced_at,
  NOW() - last_synced_at as "동기화_후_경과시간"
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;
