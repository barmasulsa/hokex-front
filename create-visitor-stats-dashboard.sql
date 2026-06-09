-- =====================================================
-- 방문자 통계 대시보드 함수 생성
-- =====================================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. 기간별 방문자 통계를 조회하는 함수 생성
CREATE OR REPLACE FUNCTION get_visitor_statistics(p_domain TEXT DEFAULT 'hokex.xyz')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_today_count BIGINT;
  v_yesterday_count BIGINT;
  v_7days_count BIGINT;
  v_30days_count BIGINT;
  v_3months_count BIGINT;
  v_6months_count BIGINT;
  v_1year_count BIGINT;
  v_total_count BIGINT;
  v_now_timestamp TIMESTAMPTZ := NOW();
BEGIN
  -- 오늘 방문자 수 (KST 기준 자정부터)
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_today_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= DATE_TRUNC('day', v_now_timestamp AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  -- 어제 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_yesterday_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= (DATE_TRUNC('day', v_now_timestamp AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
    AND created_at < DATE_TRUNC('day', v_now_timestamp AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  -- 최근 7일 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_7days_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= v_now_timestamp - INTERVAL '7 days';

  -- 최근 30일 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_30days_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= v_now_timestamp - INTERVAL '30 days';

  -- 최근 3개월 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_3months_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= v_now_timestamp - INTERVAL '3 months';

  -- 최근 6개월 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_6months_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= v_now_timestamp - INTERVAL '6 months';

  -- 최근 1년 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_1year_count
  FROM visitor_logs
  WHERE domain = p_domain
    AND created_at >= v_now_timestamp - INTERVAL '1 year';

  -- 전체 기간 방문자 수 (총합)
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_total_count
  FROM visitor_logs
  WHERE domain = p_domain;

  -- JSON 결과 생성
  v_result := JSON_BUILD_OBJECT(
    'domain', p_domain,
    'timestamp', v_now_timestamp,
    'stats', JSON_BUILD_OBJECT(
      'today', COALESCE(v_today_count, 0),
      'yesterday', COALESCE(v_yesterday_count, 0),
      'last_7_days', COALESCE(v_7days_count, 0),
      'last_30_days', COALESCE(v_30days_count, 0),
      'last_3_months', COALESCE(v_3months_count, 0),
      'last_6_months', COALESCE(v_6months_count, 0),
      'last_1_year', COALESCE(v_1year_count, 0),
      'total', COALESCE(v_total_count, 0)
    )
  );

  RETURN v_result;
END;
$$;

-- 2. 함수 실행 권한 부여 (익명 사용자도 읽기 가능)
GRANT EXECUTE ON FUNCTION get_visitor_statistics(TEXT) TO anon, authenticated;

-- 3. 테스트 쿼리
SELECT get_visitor_statistics('hokex.xyz');

-- =====================================================
-- 확인 사항
-- =====================================================
-- 이 쿼리로 현재 데이터 확인:
-- SELECT 
--   COUNT(*) as total_logs,
--   COUNT(DISTINCT visitor_hash) as unique_visitors,
--   MIN(created_at) as first_visit,
--   MAX(created_at) as last_visit
-- FROM visitor_logs
-- WHERE domain = 'hokex.xyz';
