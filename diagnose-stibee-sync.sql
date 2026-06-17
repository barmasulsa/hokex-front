-- 스티비 동기화 상태 진단 SQL

-- 1. stibee_subscribers 테이블 확인
SELECT 
  COUNT(*) as total_subscribers,
  MAX(last_synced_at) as last_sync_time,
  MIN(last_synced_at) as oldest_sync_time
FROM stibee_subscribers;

-- 2. 최근 추가된 구독자 (최근 1시간)
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  EXTRACT(EPOCH FROM (NOW() - last_synced_at)) as seconds_since_sync
FROM stibee_subscribers
WHERE last_synced_at > NOW() - INTERVAL '1 hour'
ORDER BY last_synced_at DESC
LIMIT 10;

-- 3. 오래된 구독자 (1시간 이상 동기화 안 됨)
SELECT 
  COUNT(*) as stale_subscribers
FROM stibee_subscribers
WHERE last_synced_at < NOW() - INTERVAL '1 hour';

-- 4. 테이블이 비어있는지 확인
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ 테이블이 비어있습니다! 동기화가 한 번도 실행되지 않았습니다.'
    WHEN MAX(last_synced_at) < NOW() - INTERVAL '1 hour' THEN '⚠️ 동기화가 1시간 이상 실행되지 않았습니다.'
    ELSE '✅ 동기화가 정상적으로 작동 중입니다.'
  END as status
FROM stibee_subscribers;
