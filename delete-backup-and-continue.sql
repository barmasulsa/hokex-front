-- ============================================
-- 옵션 1: 백업 테이블 삭제 후 마이그레이션 계속
-- ============================================

-- 기존 백업 테이블 삭제
DROP TABLE IF EXISTS visitor_stats_backup CASCADE;
DROP TABLE IF EXISTS visitor_stats_cache_backup CASCADE;

-- ============================================
-- STEP 2: 기존 시스템 완전 제거
-- ============================================

-- 1. Cron Job 삭제
SELECT cron.unschedule('update-visitor-stats-cache');

-- 2. Trigger 삭제
DROP TRIGGER IF EXISTS auto_update_visitor_cache ON visitor_stats;
DROP TRIGGER IF EXISTS update_visitor_stats_cache_on_insert ON visitor_stats;

-- 3. Function 삭제
DROP FUNCTION IF EXISTS trigger_update_visitor_cache() CASCADE;
DROP FUNCTION IF EXISTS update_visitor_stats_cache() CASCADE;
DROP FUNCTION IF EXISTS update_visitor_cache() CASCADE;
DROP FUNCTION IF EXISTS get_business_date(TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_business_date() CASCADE;
DROP FUNCTION IF EXISTS increment_visitor_stat(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_visitor_dedup() CASCADE;
DROP FUNCTION IF EXISTS reset_daily_visitor_counts() CASCADE;

-- 4. 테이블 삭제 (순서 중요 - 외래키 때문)
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS visitor_dedup CASCADE;
DROP TABLE IF EXISTS visitor_stats CASCADE;
DROP TABLE IF EXISTS visitor_stats_cache CASCADE;

-- 5. 기존 고급 통계 테이블도 삭제 (있다면)
DROP TABLE IF EXISTS visitor_sites CASCADE;

-- ============================================
-- 확인: 모든 관련 오브젝트가 삭제되었는지 검증
-- ============================================

-- 남아있는 visitor 관련 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%visitor%';

-- 남아있는 visitor 관련 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%visitor%';

-- 남아있는 visitor 관련 트리거 확인
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name LIKE '%visitor%' OR event_object_table LIKE '%visitor%');

-- 남아있는 cron job 확인
SELECT jobname FROM cron.job WHERE jobname LIKE '%visitor%';

SELECT '✅ STEP 2 완료 - 기존 시스템이 완전히 제거되었습니다.' AS status;
SELECT '▶️  다음 단계: setup-visitor-counter.sql 파일을 실행하세요 (STEP 3)' AS next_step;
