-- ============================================
-- 방문자 통계 캐시 트리거 전용 설정 (최적화)
-- ============================================
-- Cron job 없이 트리거만 사용하여 실시간 동기화
-- visitor_stats 테이블이 변경되면 즉시 캐시 업데이트

-- 1. 현재 상태 확인
SELECT 
  'visitor_stats' as table_name,
  visit_date,
  visit_hour,
  visit_count
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY visit_date DESC, visit_hour DESC;

SELECT 
  'visitor_stats_cache' as table_name,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 2. 자동 트리거 함수 생성
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
  
  RETURN NEW;
END;
$$;

-- 3. 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS auto_update_visitor_stats_cache ON visitor_stats;

CREATE TRIGGER auto_update_visitor_stats_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH ROW
EXECUTE FUNCTION trigger_update_visitor_stats_cache();

-- 4. 기존 cron job 제거 (있다면)
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

-- 5. 초기 동기화 (기존 데이터 캐시에 복사)
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

-- 6. 최종 검증
SELECT 
  'Verification' as status,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  total_visits,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

SELECT 
  'Comparison' as status,
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

-- 7. 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_update_visitor_stats_cache';

-- ============================================
-- 설정 완료! (트리거 전용)
-- ============================================
-- 장점:
-- 1. 실시간 동기화 (INSERT/UPDATE 즉시 반영)
-- 2. Cron job 오버헤드 없음
-- 3. 데이터 일관성 보장
-- 4. 간단한 아키텍처
-- 
-- 작동 방식:
-- - visitor_stats 테이블에 INSERT/UPDATE 발생
-- - 트리거가 자동으로 visitor_stats_cache 업데이트
-- - 홈페이지는 visitor_stats_cache 읽음 (빠름)
-- - 관리자 페이지는 visitor_stats 읽음 (상세)
-- 
-- 중복 방지:
-- - visitor_stats 테이블의 UNIQUE(visit_date, visit_hour) 제약조건
-- - record_visitor_visit() 함수의 UPSERT 로직
-- ============================================
