-- ============================================
-- 실시간 방문자 통계 시스템
-- 캐시 없이 직접 계산 (정확하고 효율적)
-- ============================================

-- 1단계: 기존 캐시 테이블 및 관련 함수 삭제
DROP TABLE IF EXISTS visitor_stats_cache CASCADE;
DROP FUNCTION IF EXISTS update_visitor_stats_cache() CASCADE;

-- 2단계: visitor_stats 테이블에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_visitor_stats_visit_date 
ON visitor_stats(visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_stats_date_id 
ON visitor_stats(visit_date, id);

-- 3단계: 실시간 통계 계산 함수 생성
CREATE OR REPLACE FUNCTION get_realtime_visitor_stats()
RETURNS TABLE (
  today BIGINT,
  yesterday BIGINT,
  last_7_days BIGINT,
  last_30_days BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  seven_days_ago DATE := CURRENT_DATE - INTERVAL '7 days';
  thirty_days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  RETURN QUERY
  SELECT
    -- 오늘 방문자 수 (id 기준으로 중복 제거)
    (SELECT COUNT(DISTINCT id) 
     FROM visitor_stats 
     WHERE visit_date = today_date)::BIGINT AS today,
    
    -- 어제 방문자 수
    (SELECT COUNT(DISTINCT id) 
     FROM visitor_stats 
     WHERE visit_date = yesterday_date)::BIGINT AS yesterday,
    
    -- 최근 7일 방문자 수
    (SELECT COUNT(DISTINCT id) 
     FROM visitor_stats 
     WHERE visit_date >= seven_days_ago 
       AND visit_date <= today_date)::BIGINT AS last_7_days,
    
    -- 최근 30일 방문자 수
    (SELECT COUNT(DISTINCT id) 
     FROM visitor_stats 
     WHERE visit_date >= thirty_days_ago 
       AND visit_date <= today_date)::BIGINT AS last_30_days;
END;
$$;

-- 4단계: RLS 정책 설정 (누구나 읽기 가능)
ALTER FUNCTION get_realtime_visitor_stats() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_realtime_visitor_stats() TO anon, authenticated;

-- 5단계: 테스트 쿼리
SELECT 
  today AS "오늘",
  yesterday AS "어제", 
  last_7_days AS "최근 7일",
  last_30_days AS "최근 30일"
FROM get_realtime_visitor_stats();

-- 6단계: 현재 데이터 확인
SELECT 
  visit_date AS "날짜",
  COUNT(DISTINCT visitor_id) AS "방문자 수",
  COUNT(*) AS "총 방문 횟수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ============================================
-- 사용 방법:
-- 
-- 프론트엔드에서 다음과 같이 호출:
-- const { data } = await supabase.rpc('get_realtime_visitor_stats')
-- 
-- 결과:
-- {
--   today: 5,
--   yesterday: 1,
--   last_7_days: 12,
--   last_30_days: 45
-- }
-- ============================================
