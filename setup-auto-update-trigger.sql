-- ============================================
-- 방문자 통계 자동 업데이트 설정 (Database Trigger)
-- ============================================
-- 
-- 이 스크립트를 Supabase SQL Editor에서 실행하면
-- 밤 12시가 지나도 통계가 자동으로 업데이트됩니다.
--
-- 실행 방법:
-- 1. Supabase Dashboard 접속
-- 2. SQL Editor 메뉴 클릭
-- 3. 이 파일 내용 전체 복사 & 붙여넣기
-- 4. Run 버튼 클릭
-- ============================================

-- 1. 캐시 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_visitor_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- visitor_stats에 변경이 있을 때마다 캐시 업데이트
  WITH stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
      COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
      COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count ELSE 0 END), 0) as last_7_days_count,
      COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count ELSE 0 END), 0) as last_30_days_count,
      COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN visit_count ELSE 0 END), 0) as last_365_days_count,
      COALESCE(SUM(visit_count), 0) as total_count,
      MIN(visit_date) as first_date
    FROM visitor_stats
  )
  UPDATE visitor_stats_cache
  SET 
    today = (SELECT today_count FROM stats),
    yesterday = (SELECT yesterday_count FROM stats),
    last_7_days = (SELECT last_7_days_count FROM stats),
    last_30_days = (SELECT last_30_days_count FROM stats),
    last_365_days = (SELECT last_365_days_count FROM stats),
    total_visits = (SELECT total_count FROM stats),
    first_visit_date = (SELECT first_date FROM stats),
    updated_at = NOW()
  WHERE cache_key = 'summary';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 기존 트리거 삭제 (있다면)
DROP TRIGGER IF EXISTS trigger_update_visitor_cache ON visitor_stats;

-- 3. 트리거 생성 (INSERT 또는 UPDATE 시 실행)
CREATE TRIGGER trigger_update_visitor_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH ROW
EXECUTE FUNCTION update_visitor_cache();

-- 4. 초기 캐시 업데이트 (즉시 실행)
WITH stats AS (
  SELECT 
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count ELSE 0 END), 0) as last_30_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN visit_count ELSE 0 END), 0) as last_365_days_count,
    COALESCE(SUM(visit_count), 0) as total_count,
    MIN(visit_date) as first_date
  FROM visitor_stats
)
UPDATE visitor_stats_cache
SET 
  today = (SELECT today_count FROM stats),
  yesterday = (SELECT yesterday_count FROM stats),
  last_7_days = (SELECT last_7_days_count FROM stats),
  last_30_days = (SELECT last_30_days_count FROM stats),
  last_365_days = (SELECT last_365_days_count FROM stats),
  total_visits = (SELECT total_count FROM stats),
  first_visit_date = (SELECT first_date FROM stats),
  updated_at = NOW()
WHERE cache_key = 'summary'
RETURNING 
  '✅ 캐시 업데이트 완료' as status,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  updated_at as "업데이트시간";

-- 5. 설정 확인
SELECT 
  '=== 트리거 설정 확인 ===' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_visitor_cache';

-- ============================================
-- 완료!
-- ============================================
-- 
-- 이제 방문자가 홈페이지를 방문할 때마다
-- 통계가 자동으로 업데이트됩니다.
--
-- 밤 12시가 지나면 첫 방문자가 접속할 때
-- "오늘"과 "어제" 통계가 자동으로 갱신됩니다.
--
-- ============================================
