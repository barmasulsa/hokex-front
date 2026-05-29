-- ============================================
-- 방문자 통계 완전 통합 설정
-- ============================================
-- 목적: visitor_stats 테이블 기반 실시간 방문 통계 시스템
-- 특징: 
--   - UPSERT 기반 중복 방지
--   - 트리거 기반 자동 캐시 동기화
--   - 실시간 통계 조회 함수
--   - Cron job 불필요 (트리거만 사용)
-- ============================================


-- ============================================
-- PART 1: 현재 상태 확인
-- ============================================

-- 1-1. visitor_stats 테이블 데이터 확인
SELECT 
  'visitor_stats' as table_name,
  visit_date,
  visit_hour,
  visit_count,
  updated_at
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 20;

-- 1-2. visitor_stats_cache 테이블 확인
SELECT 
  'visitor_stats_cache' as table_name,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  first_visit_date,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';


-- ============================================
-- PART 2: 핵심 함수 생성
-- ============================================

-- 2-1. 방문자 기록 함수 (UPSERT - 중복 방지)
CREATE OR REPLACE FUNCTION record_visitor_visit()
RETURNS JSON AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  current_hour INTEGER := EXTRACT(HOUR FROM NOW());
  result JSON;
BEGIN
  -- UPSERT: 해당 날짜/시간이 있으면 +1, 없으면 새로 생성
  -- UNIQUE(visit_date, visit_hour) 제약조건으로 중복 방지
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


-- 2-2. 실시간 통계 조회 함수 (캐시 없이 직접 계산)
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
-- PART 3: 캐시 자동 업데이트 트리거
-- ============================================

-- 3-1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION trigger_update_visitor_stats_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today INTEGER;
  v_yesterday INTEGER;
  v_last_7_days INTEGER;
  v_last_30_days INTEGER;
  v_last_365_days INTEGER;
  v_total_visits INTEGER;
  v_first_visit_date DATE;
BEGIN
  -- 각 기간별 방문 수 계산
  SELECT COALESCE(SUM(visit_count), 0) INTO v_today
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_yesterday
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE - INTERVAL '1 day';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_7_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_30_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_365_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '365 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_total_visits
  FROM visitor_stats;
  
  SELECT MIN(visit_date) INTO v_first_visit_date
  FROM visitor_stats;
  
  -- 캐시 업데이트 (UPSERT)
  INSERT INTO visitor_stats_cache (
    cache_key, 
    today, 
    yesterday, 
    last_7_days, 
    last_30_days, 
    last_365_days, 
    total_visits,
    first_visit_date,
    updated_at
  )
  VALUES (
    'summary',
    v_today,
    v_yesterday,
    v_last_7_days,
    v_last_30_days,
    v_last_365_days,
    v_total_visits,
    v_first_visit_date,
    NOW()
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    today = EXCLUDED.today,
    yesterday = EXCLUDED.yesterday,
    last_7_days = EXCLUDED.last_7_days,
    last_30_days = EXCLUDED.last_30_days,
    last_365_days = EXCLUDED.last_365_days,
    total_visits = EXCLUDED.total_visits,
    first_visit_date = EXCLUDED.first_visit_date,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 3-2. 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS auto_update_visitor_stats_cache ON visitor_stats;

CREATE TRIGGER auto_update_visitor_stats_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH ROW
EXECUTE FUNCTION trigger_update_visitor_stats_cache();


-- ============================================
-- PART 4: Cron Job 제거 (있다면)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'update-visitor-stats-cache'
    ) THEN
      PERFORM cron.unschedule('update-visitor-stats-cache');
      RAISE NOTICE 'Cron job removed - using trigger only for real-time sync';
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not installed - skipping';
END $$;


-- ============================================
-- PART 5: 초기 캐시 동기화
-- ============================================
DO $$
DECLARE
  v_today INTEGER;
  v_yesterday INTEGER;
  v_last_7_days INTEGER;
  v_last_30_days INTEGER;
  v_last_365_days INTEGER;
  v_total_visits INTEGER;
  v_first_visit_date DATE;
BEGIN
  -- 각 기간별 방문 수 계산
  SELECT COALESCE(SUM(visit_count), 0) INTO v_today
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_yesterday
  FROM visitor_stats
  WHERE visit_date = CURRENT_DATE - INTERVAL '1 day';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_7_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_30_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_365_days
  FROM visitor_stats
  WHERE visit_date >= CURRENT_DATE - INTERVAL '365 days';
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_total_visits
  FROM visitor_stats;
  
  SELECT MIN(visit_date) INTO v_first_visit_date
  FROM visitor_stats;
  
  -- 캐시 업데이트
  INSERT INTO visitor_stats_cache (
    cache_key, 
    today, 
    yesterday, 
    last_7_days, 
    last_30_days, 
    last_365_days, 
    total_visits,
    first_visit_date,
    updated_at
  )
  VALUES (
    'summary',
    v_today,
    v_yesterday,
    v_last_7_days,
    v_last_30_days,
    v_last_365_days,
    v_total_visits,
    v_first_visit_date,
    NOW()
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    today = EXCLUDED.today,
    yesterday = EXCLUDED.yesterday,
    last_7_days = EXCLUDED.last_7_days,
    last_30_days = EXCLUDED.last_30_days,
    last_365_days = EXCLUDED.last_365_days,
    total_visits = EXCLUDED.total_visits,
    first_visit_date = EXCLUDED.first_visit_date,
    updated_at = NOW();
    
  RAISE NOTICE 'Initial cache sync completed: today=%, yesterday=%, last_7_days=%, total=%', 
    v_today, v_yesterday, v_last_7_days, v_total_visits;
END $$;


-- ============================================
-- PART 6: 검증 및 테스트
-- ============================================

-- 6-1. 캐시 상태 확인
SELECT 
  'Cache Status' as status,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  total_visits,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 6-2. 동기화 상태 비교
SELECT 
  'Sync Verification' as status,
  COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as stats_today,
  vsc.today as cache_today,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) = vsc.today 
    THEN '✓ 동기화됨'
    ELSE '✗ 불일치'
  END as sync_status
FROM visitor_stats vs
CROSS JOIN visitor_stats_cache vsc
WHERE vsc.cache_key = 'summary'
GROUP BY vsc.today;

-- 6-3. 트리거 확인
SELECT 
  'Trigger Status' as status,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'auto_update_visitor_stats_cache';

-- 6-4. 함수 테스트
-- 방문 기록 테스트
SELECT 'Testing record_visitor_visit()' as test_name, record_visitor_visit() as result;

-- 실시간 통계 조회 테스트
SELECT 'Testing get_realtime_visitor_stats()' as test_name, get_realtime_visitor_stats() as result;


-- ============================================
-- PART 7: 유용한 조회 쿼리
-- ============================================

-- 7-1. 실시간 방문 통계 (직접 계산)
WITH date_ranges AS (
  SELECT
    CURRENT_DATE AS today,
    CURRENT_DATE - INTERVAL '1 day' AS yesterday,
    CURRENT_DATE - INTERVAL '7 days' AS last_7_days_start,
    CURRENT_DATE - INTERVAL '30 days' AS last_30_days_start,
    CURRENT_DATE - INTERVAL '365 days' AS last_365_days_start
)
SELECT
  COALESCE(SUM(CASE WHEN vs.visit_date = dr.today THEN vs.visit_count ELSE 0 END), 0) AS today_visits,
  COALESCE(SUM(CASE WHEN vs.visit_date = dr.yesterday THEN vs.visit_count ELSE 0 END), 0) AS yesterday_visits,
  COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_7_days_start THEN vs.visit_count ELSE 0 END), 0) AS last_7_days_visits,
  COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_30_days_start THEN vs.visit_count ELSE 0 END), 0) AS last_30_days_visits,
  COALESCE(SUM(CASE WHEN vs.visit_date >= dr.last_365_days_start THEN vs.visit_count ELSE 0 END), 0) AS last_365_days_visits,
  COALESCE(SUM(vs.visit_count), 0) AS total_visits,
  MIN(vs.visit_date) AS first_visit_date,
  NOW() AS last_updated
FROM date_ranges dr
LEFT JOIN visitor_stats vs ON vs.visit_date >= dr.last_365_days_start;

-- 7-2. 시간대별 방문 통계 (오늘)
SELECT
  visit_hour,
  visit_count,
  visit_date,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour ASC;

-- 7-3. 일별 방문 통계 (최근 30일)
SELECT
  visit_date,
  SUM(visit_count) AS daily_visits,
  COUNT(DISTINCT visit_hour) AS active_hours
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 7-4. 성능 최적화 인덱스 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'visitor_stats'
ORDER BY indexname;


-- ============================================
-- 설정 완료!
-- ============================================
-- 
-- 📊 시스템 아키텍처:
-- ┌─────────────────────────────────────────┐
-- │  1. 방문자 접속                          │
-- │     ↓                                   │
-- │  2. record_visitor_visit() 호출         │
-- │     ↓                                   │
-- │  3. visitor_stats 테이블 UPSERT         │
-- │     ↓ (트리거 자동 실행)                │
-- │  4. visitor_stats_cache 자동 업데이트   │
-- │     ↓                                   │
-- │  5. 홈페이지에서 캐시 조회 (빠름!)      │
-- └─────────────────────────────────────────┘
-- 
-- ✅ 주요 기능:
-- 1. UPSERT 기반 중복 방지
--    - UNIQUE(visit_date, visit_hour) 제약조건
--    - ON CONFLICT DO UPDATE 로직
-- 
-- 2. 트리거 기반 실시간 동기화
--    - visitor_stats INSERT/UPDATE 시 자동 실행
--    - visitor_stats_cache 즉시 업데이트
--    - Cron job 불필요
-- 
-- 3. 두 가지 조회 방법
--    - 캐시 조회: visitor_stats_cache (초고속)
--    - 실시간 조회: get_realtime_visitor_stats() (정확)
-- 
-- 4. 성능 최적화
--    - 인덱스: idx_visitor_stats_date, idx_visitor_stats_date_hour
--    - UNIQUE 제약조건으로 중복 방지
--    - 트리거로 캐시 자동 관리
-- 
-- 📝 사용 방법:
-- 
-- [프론트엔드에서 방문 기록]
-- SELECT record_visitor_visit();
-- 
-- [캐시에서 통계 조회 (빠름)]
-- SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';
-- 
-- [실시간 통계 조회 (정확)]
-- SELECT get_realtime_visitor_stats();
-- 
-- [시간대별 통계]
-- SELECT * FROM visitor_stats WHERE visit_date = CURRENT_DATE;
-- 
-- ============================================
