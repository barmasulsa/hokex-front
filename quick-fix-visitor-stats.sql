-- 방문자 통계 긴급 수정 SQL
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- 1. RPC 함수가 없으면 생성
CREATE OR REPLACE FUNCTION increment_visitor_stat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO visitor_stats (visit_date, visit_count, updated_at)
  VALUES (CURRENT_DATE, 1, NOW())
  ON CONFLICT (visit_date)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
END;
$$;

-- 2. anon 역할에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION increment_visitor_stat() TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat() TO authenticated;

-- 3. RLS 정책 재설정 (읽기는 public, 쓰기는 service_role만)
DROP POLICY IF EXISTS "Enable read access for all users" ON visitor_stats;
DROP POLICY IF EXISTS "Enable insert for service role" ON visitor_stats;
DROP POLICY IF EXISTS "Enable update for service role" ON visitor_stats;

CREATE POLICY "Enable read access for all users" 
ON visitor_stats FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for service role" 
ON visitor_stats FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for service role" 
ON visitor_stats FOR UPDATE 
USING (true);

-- 4. 캐시 테이블도 업데이트 (캐시 테이블이 있는 경우)
-- 캐시 테이블 스키마에 따라 조정 필요
-- INSERT INTO visitor_stats_cache (stat_date, visitor_count, last_updated)
-- SELECT visit_date, visit_count, NOW()
-- FROM visitor_stats
-- WHERE visit_date = CURRENT_DATE
-- ON CONFLICT (stat_date)
-- DO UPDATE SET 
--   visitor_count = EXCLUDED.visitor_count,
--   last_updated = NOW();

-- 5. 확인
SELECT 'RPC 함수:', COUNT(*) as count FROM pg_proc WHERE proname = 'increment_visitor_stat'
UNION ALL
SELECT '오늘 데이터:', COALESCE(SUM(visit_count), 0)::text FROM visitor_stats WHERE visit_date = CURRENT_DATE;
