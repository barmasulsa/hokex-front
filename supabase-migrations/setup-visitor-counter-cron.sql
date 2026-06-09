-- ===================================================================
-- Visitor Counter Cron Jobs Setup (Optional)
-- Run this AFTER setup-visitor-counter.sql
-- ===================================================================

-- 1. 만료된 dedup 레코드 정리 (1시간마다)
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 * * * *',  -- 매시 정각
  $$SELECT clean_expired_dedup_records();$$
);

-- 2. 매일 자정 today_count 리셋 (KST 기준)
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',  -- UTC 15:00 = KST 00:00 (다음날 자정)
  $$SELECT reset_daily_visitor_counts();$$
);

-- 확인
SELECT * FROM cron.job WHERE jobname IN ('cleanup-visitor-dedup', 'reset-daily-visitor-counts');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Visitor Counter Cron Jobs 설정 완료!';
  RAISE NOTICE '⏰ cleanup-visitor-dedup: 매시 정각 (만료된 dedup 레코드 삭제)';
  RAISE NOTICE '⏰ reset-daily-visitor-counts: 매일 자정 KST (today_count 리셋)';
END $$;

-- ===================================================================
-- Cron Job 삭제 (필요 시)
-- ===================================================================

/*
SELECT cron.unschedule('cleanup-visitor-dedup');
SELECT cron.unschedule('reset-daily-visitor-counts');
*/
