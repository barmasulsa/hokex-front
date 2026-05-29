-- ============================================
-- VISITOR STATS UNIFIED SETUP (통합 설정)
-- 관리자 페이지와 홈페이지 통계 동기화
-- ============================================
-- 
-- 문제: 관리자 페이지와 홈페이지가 서로 다른 통계를 표시
-- 원인: 두 곳이 서로 다른 데이터 소스 사용
--   - 관리자: getDetailedVisitorStats() → DB 직접 조회
--   - 홈페이지: getCachedVisitorStats() → 캐시 테이블 조회
-- 
-- 해결: 단일 캐시 소스 사용 + 실시간 동기화
-- 
-- ============================================

-- ============================================
-- STEP 1: 테이블 생성
-- ============================================

-- visitor_stats 테이블 (원본 데이터)
CREATE TABLE IF NOT EXISTS visitor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date DATE NOT NULL,
  visit_hour INTEGER NOT NULL CHECK (visit_hour >= 0 AND visit_hour <= 23),
  visit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visit_date, visit_hour)
);

-- visitor_stats_cache 테이블 (집계 캐시) - 재생성
DROP TABLE IF EXISTS visitor_stats_cache CASCADE;
CREATE TABLE visitor_stats_cache (
  cache_key TEXT PRIMARY KEY DEFAULT 'summary',
  today INTEGER NOT NULL DEFAULT 0,
  yesterday INTEGER NOT NULL DEFAULT 0,
  last_7_days INTEGER NOT NULL DEFAULT 0,
  last_30_days INTEGER NOT NULL DEFAULT 0,
  last_update_business_date DATE,  -- 마지막 업데이트 비즈니스 날짜
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 레코드 삽입
INSERT INTO visitor_stats_cache (cache_key, today, yesterday, last_7_days, last_30_days, last_update_business_date)
VALUES ('summary', 0, 0, 0, 0, NULL)
ON CONFLICT (cache_key) DO NOTHING;

-- ============================================
-- STEP 2: 비즈니스 날짜 계산 함수 (새벽 4시 기준)
-- ============================================

CREATE OR REPLACE FUNCTION get_business_date(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  kst_time TIMESTAMPTZ;
  kst_hour INTEGER;
BEGIN
  -- UTC를 KST(+9)로 변환
  kst_time := ts AT TIME ZONE 'Asia/Seoul';
  kst_hour := EXTRACT(HOUR FROM kst_time);
  
  -- 새벽 0시~3시59분이면 전날로 계산
  IF kst_hour < 4 THEN
    RETURN (kst_time - INTERVAL '1 day')::DATE;
  ELSE
    RETURN kst_time::DATE;
  END IF;
END;
$$;

-- ============================================
-- STEP 3: 캐시 업데이트 함수 (통합 버전)
-- ============================================

-- 기존 함수 완전 삭제 (반환 타입 변경을 위해)
-- CASCADE를 사용하여 의존성까지 모두 삭제
DROP FUNCTION IF EXISTS update_visitor_stats_cache() CASCADE;

CREATE OR REPLACE FUNCTION update_visitor_stats_cache()
RETURNS TABLE(
  today INTEGER,
  yesterday INTEGER,
  last_7_days INTEGER,
  last_30_days INTEGER,
  business_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_today INTEGER;
  v_yesterday INTEGER;
  v_last_7_days INTEGER;
  v_last_30_days INTEGER;
  v_business_today DATE;
  v_business_yesterday DATE;
  v_7_days_ago DATE;
  v_30_days_ago DATE;
BEGIN
  -- 비즈니스 날짜 계산
  v_business_today := get_business_date(NOW());
  v_business_yesterday := v_business_today - INTERVAL '1 day';
  v_7_days_ago := v_business_today - INTERVAL '6 days';  -- 오늘 포함 7일
  v_30_days_ago := v_business_today - INTERVAL '29 days'; -- 오늘 포함 30일
  
  -- 오늘 방문자 수
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_today
  FROM visitor_stats
  WHERE visit_date = v_business_today;
  
  -- 어제 방문자 수
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_yesterday
  FROM visitor_stats
  WHERE visit_date = v_business_yesterday;
  
  -- 최근 7일 방문자 수 (오늘 포함)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_last_7_days
  FROM visitor_stats
  WHERE visit_date >= v_7_days_ago
    AND visit_date <= v_business_today;
  
  -- 최근 30일 방문자 수 (오늘 포함)
  SELECT COALESCE(SUM(visit_count), 0)
  INTO v_last_30_days
  FROM visitor_stats
  WHERE visit_date >= v_30_days_ago
    AND visit_date <= v_business_today;
  
  -- 캐시 업데이트
  UPDATE visitor_stats_cache
  SET 
    today = v_today,
    yesterday = v_yesterday,
    last_7_days = v_last_7_days,
    last_30_days = v_last_30_days,
    last_update_business_date = v_business_today,
    updated_at = NOW()
  WHERE cache_key = 'summary';
  
  -- 레코드가 없으면 삽입
  IF NOT FOUND THEN
    INSERT INTO visitor_stats_cache (cache_key, today, yesterday, last_7_days, last_30_days, last_update_business_date)
    VALUES ('summary', v_today, v_yesterday, v_last_7_days, v_last_30_days, v_business_today);
  END IF;
  
  -- 결과 반환
  RETURN QUERY
  SELECT v_today, v_yesterday, v_last_7_days, v_last_30_days, v_business_today;
END;
$$;

-- ============================================
-- STEP 4: 자동 트리거 설정
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_visitor_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_visitor_stats_cache();
  RETURN NEW;
END;
$$;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS auto_update_visitor_cache ON visitor_stats;
CREATE TRIGGER auto_update_visitor_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_visitor_cache();

-- ============================================
-- STEP 5: pg_cron 스케줄러 설정 (1분마다)
-- ============================================

-- 기존 스케줄 삭제 (있으면)
DO $$
BEGIN
  PERFORM cron.unschedule('update-visitor-stats-cache');
EXCEPTION
  WHEN OTHERS THEN
    -- 스케줄이 없으면 무시
    NULL;
END $$;

-- 새 스케줄 등록 (1분마다 - 실시간성 향상)
SELECT cron.schedule(
  'update-visitor-stats-cache',
  '* * * * *',  -- 1분마다
  $$SELECT update_visitor_stats_cache();$$
);

-- ============================================
-- STEP 6: RPC 함수 (increment_visitor_stat)
-- ============================================

CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (p_visit_date, p_visit_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
END;
$$;

-- ============================================
-- STEP 7: RLS (Row Level Security) 설정
-- ============================================

-- visitor_stats 테이블 RLS
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON visitor_stats;
CREATE POLICY "Allow public read access"
ON visitor_stats FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow service role full access" ON visitor_stats;
CREATE POLICY "Allow service role full access"
ON visitor_stats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- visitor_stats_cache 테이블 RLS
ALTER TABLE visitor_stats_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON visitor_stats_cache;
CREATE POLICY "Allow public read access"
ON visitor_stats_cache FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow service role full access" ON visitor_stats_cache;
CREATE POLICY "Allow service role full access"
ON visitor_stats_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 8: 초기 캐시 업데이트 및 확인
-- ============================================

-- 캐시 강제 업데이트
SELECT * FROM update_visitor_stats_cache();

-- 현재 상태 확인
SELECT 
  NOW() AT TIME ZONE 'Asia/Seoul' as current_time_kst,
  get_business_date(NOW()) as business_date,
  EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Seoul') as current_hour_kst;

-- 캐시 내용 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_update_business_date,
  updated_at AT TIME ZONE 'Asia/Seoul' as updated_at_kst
FROM visitor_stats_cache 
WHERE cache_key = 'summary';

-- 원본 데이터 확인 (최근 3일)
SELECT 
  visit_date,
  SUM(visit_count) as total_visits
FROM visitor_stats
WHERE visit_date >= get_business_date(NOW()) - INTERVAL '2 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- ============================================
-- 완료!
-- ============================================
-- 
-- 이제 관리자 페이지와 홈페이지가 동일한 통계를 표시합니다.
-- 
-- 작동 방식:
-- 1. 사용자 방문 → recordDetailedVisit() 호출
-- 2. increment_visitor_stat RPC → visitor_stats 테이블 업데이트
-- 3. 트리거 자동 실행 → visitor_stats_cache 업데이트
-- 4. 관리자/홈페이지 모두 캐시에서 조회 → 동일한 값
-- 
-- 추가 보장:
-- - 1분마다 pg_cron이 캐시 재계산 (혹시 모를 불일치 방지)
-- - 비즈니스 날짜 기준 (새벽 4시 기준) 일관성 유지
-- 
-- ============================================
