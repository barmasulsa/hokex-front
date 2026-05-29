-- ============================================
-- 새벽 4시 기준 "어제" 계산 수정
-- ============================================

-- 1. get_business_date() 함수 재생성 (새벽 4시 기준)
CREATE OR REPLACE FUNCTION get_business_date()
RETURNS DATE AS $$
DECLARE
  current_timestamp TIMESTAMPTZ := NOW();
  current_hour INTEGER := EXTRACT(HOUR FROM current_timestamp AT TIME ZONE 'Asia/Seoul');
BEGIN
  -- 새벽 0시~3시59분은 전날로 계산
  IF current_hour < 4 THEN
    RETURN (current_timestamp AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE;
  ELSE
    RETURN (current_timestamp AT TIME ZONE 'Asia/Seoul')::DATE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- 2. 캐시 업데이트 함수 수정 (올바른 컬럼명 사용)
CREATE OR REPLACE FUNCTION update_visitor_stats_cache()
RETURNS JSON AS $$
DECLARE
  business_today DATE := get_business_date();
  business_yesterday DATE := business_today - INTERVAL '1 day';
  
  today_count INTEGER;
  yesterday_count INTEGER;
  
  result JSON;
BEGIN
  -- 오늘 방문자 수 (실시간)
  SELECT COALESCE(SUM(visit_count), 0) INTO today_count
  FROM visitor_stats
  WHERE visit_date = business_today;
  
  -- 어제 방문자 수 (새벽 4시 기준)
  SELECT COALESCE(SUM(visit_count), 0) INTO yesterday_count
  FROM visitor_stats
  WHERE visit_date = business_yesterday;
  
  -- 캐시 업데이트
  UPDATE visitor_stats_cache
  SET 
    today = today_count,
    yesterday = yesterday_count,
    updated_at = NOW()
  WHERE cache_key = 'summary';
  
  -- 결과 반환
  SELECT json_build_object(
    'today', today_count,
    'yesterday', yesterday_count,
    'business_date', business_today,
    'updated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. 즉시 캐시 업데이트 실행
SELECT update_visitor_stats_cache();


-- 4. 결과 확인
SELECT 
  cache_key,
  today,
  yesterday,
  updated_at,
  get_business_date() AS current_business_date
FROM visitor_stats_cache
WHERE cache_key = 'summary';
