-- =====================================================
-- 방문자 통계 함수 수정 (visitor_hash 컬럼 오류 해결)
-- =====================================================
-- 문제: visitor_logs 테이블에 visitor_hash 컬럼이 없음
-- 해결: visitor_dedup 테이블 또는 visitor_ip 사용

-- 방법 1: visitor_dedup 테이블 사용 (권장)
-- visitor_dedup는 고유 방문자 추적을 위해 설계된 테이블
CREATE OR REPLACE FUNCTION get_visitor_statistics(p_domain TEXT DEFAULT 'hokex.xyz')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_site_id UUID;
  v_today_count BIGINT;
  v_yesterday_count BIGINT;
  v_7days_count BIGINT;
  v_30days_count BIGINT;
  v_3months_count BIGINT;
  v_6months_count BIGINT;
  v_1year_count BIGINT;
  v_total_count BIGINT;
  v_current_online BIGINT;
  v_now_timestamp TIMESTAMPTZ := NOW();
  v_kst_today TIMESTAMPTZ;
  v_kst_yesterday TIMESTAMPTZ;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain;

  -- 사이트가 없으면 빈 통계 반환
  IF v_site_id IS NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'domain', p_domain,
      'timestamp', v_now_timestamp,
      'stats', JSON_BUILD_OBJECT(
        'current_online', 0,
        'today', 0,
        'yesterday', 0,
        'last_7_days', 0,
        'last_30_days', 0,
        'last_3_months', 0,
        'last_6_months', 0,
        'last_1_year', 0,
        'total', 0
      )
    );
  END IF;

  -- KST 기준 오늘/어제 시작 시간 계산
  v_kst_today := DATE_TRUNC('day', v_now_timestamp AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_kst_yesterday := v_kst_today - INTERVAL '1 day';

  -- 현재 접속자 수 (최근 5분 이내 방문)
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_current_online
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '5 minutes';

  -- 오늘 방문자 수 (KST 기준 자정부터)
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_today_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_kst_today;

  -- 어제 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_yesterday_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_kst_yesterday
    AND last_visit < v_kst_today;

  -- 최근 7일 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_7days_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '7 days';

  -- 최근 30일 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_30days_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '30 days';

  -- 최근 3개월 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_3months_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '3 months';

  -- 최근 6개월 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_6months_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '6 months';

  -- 최근 1년 방문자 수
  SELECT COUNT(DISTINCT visitor_hash)
  INTO v_1year_count
  FROM visitor_dedup
  WHERE site_id = v_site_id
    AND last_visit >= v_now_timestamp - INTERVAL '1 year';

  -- 전체 기간 방문자 수 (visitor_sites 테이블의 total_count 사용)
  SELECT total_count
  INTO v_total_count
  FROM visitor_sites
  WHERE id = v_site_id;

  -- JSON 결과 생성
  v_result := JSON_BUILD_OBJECT(
    'domain', p_domain,
    'timestamp', v_now_timestamp,
    'stats', JSON_BUILD_OBJECT(
      'current_online', COALESCE(v_current_online, 0),
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

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_visitor_statistics(TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- 테스트 쿼리
-- =====================================================
SELECT get_visitor_statistics('hokex.xyz');

-- 현재 데이터 확인
SELECT 
  'visitor_sites' as table_name,
  COUNT(*) as total_records,
  array_agg(domain) as domains
FROM visitor_sites
UNION ALL
SELECT 
  'visitor_dedup' as table_name,
  COUNT(*) as total_records,
  ARRAY['unique_visitors: ' || COUNT(DISTINCT visitor_hash)::TEXT]
FROM visitor_dedup
UNION ALL
SELECT 
  'visitor_logs' as table_name,
  COUNT(*) as total_records,
  ARRAY['total_logs: ' || COUNT(*)::TEXT]
FROM visitor_logs;

-- visitor_dedup 데이터 샘플 확인
SELECT 
  vs.domain,
  COUNT(DISTINCT vd.visitor_hash) as unique_visitors,
  COUNT(*) as total_dedup_records,
  MIN(vd.last_visit) as first_visit,
  MAX(vd.last_visit) as last_visit
FROM visitor_dedup vd
JOIN visitor_sites vs ON vd.site_id = vs.id
GROUP BY vs.domain;
