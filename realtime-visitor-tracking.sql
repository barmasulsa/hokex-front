-- ============================================
-- 실시간 방문자 추적 시스템
-- ============================================
-- 목적: visitor_stats 테이블을 사용하여 실시간으로 정확한 방문 통계 제공
-- 특징: 효율적인 쿼리, 정확한 집계, 실시간 업데이트

-- ============================================
-- 1. 현재 방문 통계 실시간 조회
-- ============================================
WITH date_ranges AS (
  SELECT
    CURRENT_DATE AS today,
    CURRENT_DATE - INTERVAL '1 day' AS yesterday,
    CURRENT_DATE - INTERVAL '7 days' AS last_7_days_start,
    CURRENT_DATE - INTERVAL '30 days' AS last_30_days_start,
    CURRENT_DATE - INTERVAL '365 days' AS last_365_days_start
)
SELECT
  -- 오늘 방문자 수
  COALESCE(SUM(CASE 
    WHEN vs.visit_date = dr.today 
    THEN vs.visit_count 
    ELSE 0 
  END), 0) AS today_visits,
  
  -- 어제 방문자 수
  COALESCE(SUM(CASE 
    WHEN vs.visit_date = dr.yesterday 
    THEN vs.visit_count 
    ELSE 0 
  END), 0) AS yesterday_visits,
  
  -- 최근 7일 방문자 수
  COALESCE(SUM(CASE 
    WHEN vs.visit_date >= dr.last_7_days_start 
    THEN vs.visit_count 
    ELSE 0 
  END), 0) AS last_7_days_visits,
  
  -- 최근 30일 방문자 수
  COALESCE(SUM(CASE 
    WHEN vs.visit_date >= dr.last_30_days_start 
    THEN vs.visit_count 
    ELSE 0 
  END), 0) AS last_30_days_visits,
  
  -- 최근 365일 방문자 수
  COALESCE(SUM(CASE 
    WHEN vs.visit_date >= dr.last_365_days_start 
    THEN vs.visit_count 
    ELSE 0 
  END), 0) AS last_365_days_visits,
  
  -- 전체 방문자 수
  COALESCE(SUM(vs.visit_count), 0) AS total_visits,
  
  -- 첫 방문 날짜
  MIN(vs.visit_date) AS first_visit_date,
  
  -- 마지막 업데이트 시간
  NOW() AS last_updated
FROM date_ranges dr
LEFT JOIN visitor_stats vs ON vs.visit_date >= dr.last_365_days_start;


-- ============================================
-- 2. 시간대별 방문 통계 (오늘)
-- ============================================
SELECT
  visit_hour,
  visit_count,
  visit_date,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour ASC;


-- ============================================
-- 3. 일별 방문 통계 (최근 30일)
-- ============================================
SELECT
  visit_date,
  SUM(visit_count) AS daily_visits,
  COUNT(DISTINCT visit_hour) AS active_hours
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY visit_date
ORDER BY visit_date DESC;


-- ============================================
-- 4. 방문자 기록 함수 (UPSERT)
-- ============================================
-- 사용법: SELECT record_visitor_visit();
CREATE OR REPLACE FUNCTION record_visitor_visit()
RETURNS JSON AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  current_hour INTEGER := EXTRACT(HOUR FROM NOW());
  result JSON;
BEGIN
  -- UPSERT: 해당 날짜/시간이 있으면 +1, 없으면 새로 생성
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (current_date, current_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
  
  -- 결과 반환
  SELECT json_build_object(
    'success', true,
    'visit_date', current_date,
    'visit_hour', current_hour,
    'message', 'Visit recorded successfully'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. 실시간 통계 조회 함수 (캐싱 없이)
-- ============================================
CREATE OR REPLACE FUNCTION get_realtime_visitor_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH date_ranges AS (
    SELECT
      CURRENT_DATE AS today,
      CURRENT_DATE - INTERVAL '1 day' AS yesterday,
      CURRENT_DATE - INTERVAL '7 days' AS last_7_days_start,
      CURRENT_DATE - INTERVAL '30 days' AS last_30_days_start,
      CURRENT_DATE - INTERVAL '365 days' AS last_365_days_start
  )
  SELECT json_build_object(
    'today', COALESCE(SUM(CASE WHEN vs.visit_date = dr.today THEN vs.visit_count ELSE 0 END), 0),
    'yesterday', COALESCE(SUM(CASE WHEN vs.visit_date = dr.yesterday THEN vs.visit_count ELSE 0 END), 0),
    'last_7_days', COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_7_days_start THEN vs.visit_count ELSE 0 END), 0),
    'last_30_days', COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_30_days_start THEN vs.visit_count ELSE 0 END), 0),
    'last_365_days', COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_365_days_start THEN vs.visit_count ELSE 0 END), 0),
    'total', COALESCE(SUM(vs.visit_count), 0),
    'first_visit_date', MIN(vs.visit_date),
    'last_updated', NOW()
  ) INTO result
  FROM date_ranges dr
  LEFT JOIN visitor_stats vs ON vs.visit_date >= dr.last_365_days_start;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 6. 테스트 쿼리
-- ============================================

-- 방문 기록 테스트
SELECT record_visitor_visit();

-- 실시간 통계 조회 테스트
SELECT get_realtime_visitor_stats();

-- 직접 조회 테스트
SELECT * FROM visitor_stats ORDER BY visit_date DESC, visit_hour DESC LIMIT 10;


-- ============================================
-- 7. 성능 최적화 인덱스 확인
-- ============================================
-- 이미 생성된 인덱스:
-- - idx_visitor_stats_date (visit_date DESC)
-- - idx_visitor_stats_date_hour (visit_date, visit_hour)
-- - UNIQUE(visit_date, visit_hour)

-- 인덱스 사용 확인
EXPLAIN ANALYZE
SELECT SUM(visit_count) 
FROM visitor_stats 
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days';
