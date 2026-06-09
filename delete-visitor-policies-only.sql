-- 기존 정책만 삭제하는 SQL
-- Supabase SQL Editor에서 이것만 먼저 실행하세요

DROP POLICY IF EXISTS "Public can read visitor stats" ON visitor_sites;
DROP POLICY IF EXISTS "Service role can manage sites" ON visitor_sites;
DROP POLICY IF EXISTS "Service role can manage logs" ON visitor_logs;
DROP POLICY IF EXISTS "Service role can manage dedup" ON visitor_dedup;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 기존 정책 삭제 완료!';
  RAISE NOTICE '➡️  이제 create-visitor-counter-tables.sql 을 실행하세요';
END $$;
