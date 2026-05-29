-- ============================================
-- 스마트 방문자 추적 시스템 (새벽 4시 기준)
-- ============================================
-- 특징:
-- - 오늘: 30분마다 업데이트
-- - 어제: 새벽 4시에 자동 전환
-- - 최근 7일/30일: 하루 1번 업데이트 (새벽 4시 이후)
-- - 실시간 정확한 데이터

-- ============================================
-- 1. 캐시 테이블 생성 (이미 있으면 스킵)
-- ============================================
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
CREATE POLICY "Anyone can read smart cache" 
  ON visitor_stats_smart_cache 
  FOR SELECT 
  USING (true);


-- ============================================
-- 2. 새벽 4시 기준 "오늘" 계산 함수
-- ============================================
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


-- ============================================
-- 3. 스마트 캐시 업데이트 함수
-- ============================================
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


-- ============================================
-- 4. 캐시 조회 함수 (빠른 응답)
-- ============================================
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


-- ============================================
-- 5. 자동 업데이트 스케줄 설정
-- ============================================

-- 5-1. 오늘 통계: 30분마다 업데이트
SELECT cron.schedule(
  'update-today-visitor-stats',
  '*/30 * * * *', -- 30분마다
  $$
  SELECT update_visitor_smart_cache();
  $$
);

-- 5-2. 어제/주간/월간 통계: 매일 새벽 4시 10분에 업데이트
SELECT cron.schedule(
  'update-daily-visitor-stats',
  '10 4 * * *', -- 매일 새벽 4시 10분
  $$
  SELECT update_visitor_smart_cache();
  $$
);


-- ============================================
-- 6. 초기 캐시 데이터 생성
-- ============================================
SELECT update_visitor_smart_cache();


-- ============================================
-- 7. 사용 예시
-- ============================================

-- 캐시에서 빠르게 조회 (권장)
SELECT get_visitor_stats_from_cache();

-- 수동으로 캐시 업데이트
SELECT update_visitor_smart_cache();

-- 현재 비즈니스 날짜 확인
SELECT get_business_date() AS business_date;

-- 캐시 상태 확인
SELECT 
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS age
FROM visitor_stats_smart_cache
ORDER BY cache_type;


-- ============================================
-- 8. 테스트 쿼리
-- ============================================

-- 새벽 4시 기준 날짜 테스트
SELECT 
  NOW() AS current_time,
  EXTRACT(HOUR FROM NOW()) AS current_hour,
  get_business_date() AS business_date,
  CASE 
    WHEN EXTRACT(HOUR FROM NOW()) < 4 THEN '전날로 계산됨'
    ELSE '오늘로 계산됨'
  END AS date_logic;

-- 실제 데이터와 캐시 비교
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
  r.business_date,
  r.real_today_count,
  c.cached_today_count,
  r.real_today_count - c.cached_today_count AS difference
FROM real_data r
CROSS JOIN cache_data c;


-- ============================================
-- 9. 스케줄 확인 및 관리
-- ============================================

-- 현재 등록된 cron job 확인
SELECT * FROM cron.job WHERE jobname LIKE '%visitor%';

-- cron job 삭제 (필요시)
-- SELECT cron.unschedule('update-today-visitor-stats');
-- SELECT cron.unschedule('update-daily-visitor-stats');


-- ============================================
-- 10. 성능 모니터링
-- ============================================

-- 캐시 업데이트 히스토리 (로그 테이블 생성 옵션)
CREATE TABLE IF NOT EXISTS visitor_cache_update_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  today_count INTEGER,
  yesterday_count INTEGER,
  weekly_count INTEGER,
  monthly_count INTEGER,
  business_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 업데이트 로그 기록 함수
CREATE OR REPLACE FUNCTION log_cache_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cache_type = 'today' THEN
    INSERT INTO visitor_cache_update_log (
      today_count,
      business_date
    )
    SELECT 
      NEW.visit_count,
      get_business_date();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS log_today_cache_update ON visitor_stats_smart_cache;
CREATE TRIGGER log_today_cache_update
  AFTER UPDATE ON visitor_stats_smart_cache
  FOR EACH ROW
  WHEN (NEW.cache_type = 'today')
  EXECUTE FUNCTION log_cache_update();


-- ============================================
-- 완료!
-- ============================================
-- 이제 다음과 같이 동작합니다:
-- 
-- 1. 오늘 통계: 30분마다 자동 업데이트
-- 2. 새벽 4시가 되면:
--    - 이전 "오늘"이 자동으로 "어제"로 전환
--    - 새로운 "오늘"이 새벽 4시부터 시작
-- 3. 최근 7일/30일: 매일 새벽 4시 10분에 1번 업데이트
-- 4. 빠른 조회: get_visitor_stats_from_cache() 사용
