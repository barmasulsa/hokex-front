-- ============================================================================
-- 방문자 통계 완전 설정 및 동기화 SQL (새벽 4시 기준) - 안전 버전
-- ============================================================================
-- 목적: visitor_stats와 visitor_stats_cache 테이블을 완전히 동기화하여
--       홈페이지와 관리자 페이지에서 동일한 방문자 수가 표시되도록 함
-- 
-- 특징:
-- - 오늘: 30분마다 업데이트
-- - 어제: 새벽 4시에 자동 전환
-- - 최근 7일/30일: 하루 1번 업데이트 (새벽 4시 이후)
-- - 실시간 정확한 데이터
-- - 안전한 cron job 삭제 처리
-- 
-- 사용법: Supabase SQL Editor에서 전체 실행
-- ============================================================================

-- ============================================================================
-- STEP 1: 현재 상태 확인
-- ============================================================================

-- 1-1. 캐시 테이블 현재 상태
SELECT 
  '=== 캐시 테이블 현재 상태 ===' as info,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 1-2. visitor_stats 테이블 최근 3일 데이터
SELECT 
  '=== visitor_stats 최근 3일 ===' as info,
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;


-- ============================================================================
-- STEP 2: 새벽 4시 기준 비즈니스 날짜 함수 생성
-- ============================================================================

-- 기존 함수 삭제 (있다면)
DROP FUNCTION IF EXISTS get_business_date();

-- 새벽 4시 기준 "오늘" 계산 함수
CREATE OR REPLACE FUNCTION get_business_date()
RETURNS DATE AS $$
DECLARE
  current_timestamp TIMESTAMPTZ := NOW();
  current_hour INTEGER := EXTRACT(HOUR FROM current_timestamp);
BEGIN
  -- 새벽 0시~3시59분은 전날로 계산
  IF current_hour < 4 THEN
    RETURN (current_timestamp - INTERVAL '1 day')::DATE;
  ELSE
    RETURN current_timestamp::DATE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- STEP 3: 캐시 업데이트 함수 생성/재생성 (새벽 4시 기준 적용)
-- ============================================================================

-- 기존 함수 삭제 (있다면)
DROP FUNCTION IF EXISTS update_visitor_stats_cache();

-- 캐시 업데이트 함수 생성 (새벽 4시 기준)
CREATE OR REPLACE FUNCTION update_visitor_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  business_today DATE := get_business_date();
  business_yesterday DATE := business_today - INTERVAL '1 day';
  v_today INTEGER;
  v_yesterday INTEGER;
  v_last_7_days INTEGER;
  v_last_30_days INTEGER;
BEGIN
  -- 오늘 방문자 수 (새벽 4시 기준)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_today
  FROM visitor_stats
  WHERE visit_date = business_today;
  
  -- 어제 방문자 수 (새벽 4시 기준)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_yesterday
  FROM visitor_stats
  WHERE visit_date = business_yesterday;
  
  -- 최근 7일 방문자 수 (새벽 4시 기준)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_last_7_days
  FROM visitor_stats
  WHERE visit_date >= business_today - INTERVAL '7 days'
    AND visit_date < business_today;
  
  -- 최근 30일 방문자 수 (새벽 4시 기준)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_last_30_days
  FROM visitor_stats
  WHERE visit_date >= business_today - INTERVAL '30 days'
    AND visit_date < business_today;
  
  -- 캐시 테이블 업데이트 (UPSERT)
  INSERT INTO visitor_stats_cache (
    cache_key,
    today,
    yesterday,
    last_7_days,
    last_30_days,
    updated_at
  )
  VALUES (
    'summary',
    v_today,
    v_yesterday,
    v_last_7_days,
    v_last_30_days,
    NOW()
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    today = EXCLUDED.today,
    yesterday = EXCLUDED.yesterday,
    last_7_days = EXCLUDED.last_7_days,
    last_30_days = EXCLUDED.last_30_days,
    updated_at = EXCLUDED.updated_at;
    
  RAISE NOTICE '캐시 업데이트 완료 (새벽 4시 기준): 비즈니스날짜=%, 오늘=%, 어제=%, 7일=%, 30일=%', 
    business_today, v_today, v_yesterday, v_last_7_days, v_last_30_days;
END;
$$;


-- ============================================================================
-- STEP 4: 자동 트리거 설정 (visitor_stats 변경 시 캐시 자동 업데이트)
-- ============================================================================

-- 기존 트리거 삭제 (있다면)
DROP TRIGGER IF EXISTS trigger_update_visitor_cache ON visitor_stats;
DROP FUNCTION IF EXISTS trigger_update_visitor_cache_fn();

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION trigger_update_visitor_cache_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- visitor_stats 테이블이 변경될 때마다 캐시 업데이트
  PERFORM update_visitor_stats_cache();
  RETURN NEW;
END;
$$;

-- 트리거 생성
CREATE TRIGGER trigger_update_visitor_cache
AFTER INSERT OR UPDATE OR DELETE ON visitor_stats
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_visitor_cache_fn();


-- ============================================================================
-- STEP 5: 스마트 캐시 테이블 생성 (30분 주기 업데이트용)
-- ============================================================================

-- 스마트 캐시 테이블 생성
CREATE TABLE IF NOT EXISTS visitor_stats_smart_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type TEXT UNIQUE NOT NULL, -- 'today', 'yesterday', 'weekly', 'monthly'
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visitor_stats_smart_cache_type 
  ON visitor_stats_smart_cache(cache_type);

-- RLS 활성화
ALTER TABLE visitor_stats_smart_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
DROP POLICY IF EXISTS "Anyone can read smart cache" ON visitor_stats_smart_cache;
CREATE POLICY "Anyone can read smart cache" 
  ON visitor_stats_smart_cache 
  FOR SELECT 
  USING (true);


-- ============================================================================
-- STEP 6: 스마트 캐시 업데이트 함수 (30분 주기용)
-- ============================================================================

DROP FUNCTION IF EXISTS update_visitor_smart_cache();

CREATE OR REPLACE FUNCTION update_visitor_smart_cache()
RETURNS JSON AS $$
DECLARE
  business_today DATE := get_business_date();
  business_yesterday DATE := business_today - INTERVAL '1 day';
  last_7_days_start DATE := business_today - INTERVAL '7 days';
  last_30_days_start DATE := business_today - INTERVAL '30 days';
  
  today_count INTEGER;
  yesterday_count INTEGER;
  weekly_count INTEGER;
  monthly_count INTEGER;
  
  result JSON;
BEGIN
  -- 오늘 방문자 수 (실시간)
  SELECT COALESCE(SUM(visit_count), 0) INTO today_count
  FROM visitor_stats
  WHERE visit_date = business_today;
  
  -- 어제 방문자 수
  SELECT COALESCE(SUM(visit_count), 0) INTO yesterday_count
  FROM visitor_stats
  WHERE visit_date = business_yesterday;
  
  -- 최근 7일 방문자 수
  SELECT COALESCE(SUM(visit_count), 0) INTO weekly_count
  FROM visitor_stats
  WHERE visit_date >= last_7_days_start AND visit_date <= business_today;
  
  -- 최근 30일 방문자 수
  SELECT COALESCE(SUM(visit_count), 0) INTO monthly_count
  FROM visitor_stats
  WHERE visit_date >= last_30_days_start AND visit_date <= business_today;
  
  -- 캐시 업데이트 (UPSERT)
  INSERT INTO visitor_stats_smart_cache (cache_type, visit_count, last_updated)
  VALUES 
    ('today', today_count, NOW()),
    ('yesterday', yesterday_count, NOW()),
    ('weekly', weekly_count, NOW()),
    ('monthly', monthly_count, NOW())
  ON CONFLICT (cache_type) 
  DO UPDATE SET 
    visit_count = EXCLUDED.visit_count,
    last_updated = NOW();
  
  -- 결과 반환
  SELECT json_build_object(
    'today', today_count,
    'yesterday', yesterday_count,
    'last_7_days', weekly_count,
    'last_30_days', monthly_count,
    'business_date', business_today,
    'updated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- STEP 7: 캐시 조회 함수 (빠른 응답)
-- ============================================================================

DROP FUNCTION IF EXISTS get_visitor_stats_from_cache();

CREATE OR REPLACE FUNCTION get_visitor_stats_from_cache()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today', MAX(CASE WHEN cache_type = 'today' THEN visit_count ELSE 0 END),
    'yesterday', MAX(CASE WHEN cache_type = 'yesterday' THEN visit_count ELSE 0 END),
    'last_7_days', MAX(CASE WHEN cache_type = 'weekly' THEN visit_count ELSE 0 END),
    'last_30_days', MAX(CASE WHEN cache_type = 'monthly' THEN visit_count ELSE 0 END),
    'business_date', get_business_date(),
    'last_updated', MAX(last_updated)
  ) INTO result
  FROM visitor_stats_smart_cache;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- STEP 8: 자동 스케줄링 설정 (pg_cron 사용) - 안전한 삭제 처리
-- ============================================================================

-- 기존 스케줄 안전하게 삭제
DO $$
BEGIN
  -- update-today-visitor-stats 삭제 시도
  BEGIN
    PERFORM cron.unschedule('update-today-visitor-stats');
    RAISE NOTICE 'update-today-visitor-stats job deleted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'update-today-visitor-stats job not found, skipping';
  END;
  
  -- update-daily-visitor-stats 삭제 시도
  BEGIN
    PERFORM cron.unschedule('update-daily-visitor-stats');
    RAISE NOTICE 'update-daily-visitor-stats job deleted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'update-daily-visitor-stats job not found, skipping';
  END;
END $$;

-- 8-1. 오늘 통계: 30분마다 업데이트
SELECT cron.schedule(
  'update-today-visitor-stats',
  '*/30 * * * *', -- 30분마다
  $$SELECT update_visitor_smart_cache();$$
);

-- 8-2. 어제/주간/월간 통계: 매일 새벽 4시 10분에 업데이트
SELECT cron.schedule(
  'update-daily-visitor-stats',
  '10 4 * * *', -- 매일 새벽 4시 10분
  $$SELECT update_visitor_smart_cache();$$
);


-- ============================================================================
-- STEP 9: 초기 캐시 데이터 생성
-- ============================================================================

-- 기존 캐시 업데이트
SELECT update_visitor_stats_cache();

-- 스마트 캐시 초기화
SELECT update_visitor_smart_cache();


-- ============================================================================
-- STEP 10: 최종 검증
-- ============================================================================

-- 10-1. visitor_stats 테이블 최근 데이터
SELECT 
  '=== visitor_stats 최근 3일 (최종) ===' as info,
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 10-2. 캐시 테이블 최종 상태
SELECT 
  '=== visitor_stats_cache 최종 상태 ===' as info,
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  updated_at as "업데이트시간"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 10-3. 스마트 캐시 테이블 상태
SELECT 
  '=== visitor_stats_smart_cache 상태 ===' as info,
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS age
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 10-4. 트리거 확인
SELECT 
  '=== 트리거 설정 확인 ===' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_visitor_cache';

-- 10-5. 스케줄 확인
SELECT 
  '=== Cron 스케줄 확인 ===' as info,
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%visitor%';

-- 10-6. 새벽 4시 기준 날짜 테스트
SELECT 
  '=== 새벽 4시 기준 날짜 로직 ===' as info,
  NOW() AS current_time,
  EXTRACT(HOUR FROM NOW()) AS current_hour,
  get_business_date() AS business_date,
  CASE 
    WHEN EXTRACT(HOUR FROM NOW()) < 4 THEN '전날로 계산됨'
    ELSE '오늘로 계산됨'
  END AS date_logic;

-- 10-7. 실제 데이터와 캐시 비교
WITH real_data AS (
  SELECT 
    get_business_date() AS business_date,
    COALESCE(SUM(visit_count), 0) AS real_today_count
  FROM visitor_stats
  WHERE visit_date = get_business_date()
),
cache_data AS (
  SELECT visit_count AS cached_today_count
  FROM visitor_stats_smart_cache
  WHERE cache_type = 'today'
)
SELECT 
  '=== 실제 데이터 vs 캐시 비교 ===' as info,
  r.business_date,
  r.real_today_count,
  c.cached_today_count,
  r.real_today_count - c.cached_today_count AS difference
FROM real_data r
CROSS JOIN cache_data c;


-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '방문자 통계 완전 설정 완료! (새벽 4시 기준)';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ 새벽 4시 기준 비즈니스 날짜 함수 생성 완료';
  RAISE NOTICE '✅ 캐시 업데이트 함수 생성 완료 (기존 + 스마트 캐시)';
  RAISE NOTICE '✅ 자동 트리거 설정 완료 (visitor_stats 변경 시 자동 업데이트)';
  RAISE NOTICE '✅ 즉시 동기화 실행 완료';
  RAISE NOTICE '✅ 자동 스케줄링 설정 완료:';
  RAISE NOTICE '   - 오늘 통계: 30분마다 업데이트';
  RAISE NOTICE '   - 어제/주간/월간: 매일 새벽 4시 10분 업데이트';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 동작 방식:';
  RAISE NOTICE '   1. 오늘 통계: 30분마다 자동 업데이트';
  RAISE NOTICE '   2. 새벽 4시가 되면:';
  RAISE NOTICE '      - 이전 "오늘"이 자동으로 "어제"로 전환';
  RAISE NOTICE '      - 새로운 "오늘"이 새벽 4시부터 시작';
  RAISE NOTICE '   3. 최근 7일/30일: 매일 새벽 4시 10분에 1번 업데이트';
  RAISE NOTICE '   4. 빠른 조회: get_visitor_stats_from_cache() 사용';
  RAISE NOTICE '';
  RAISE NOTICE '이제 홈페이지와 관리자 페이지에서 동일한 방문자 수가 표시됩니다.';
  RAISE NOTICE '브라우저에서 Ctrl+Shift+R로 새로고침하세요.';
  RAISE NOTICE '============================================================================';
END $$;
