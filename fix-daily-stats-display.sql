-- 날짜별 방문자 통계 표시 수정
-- 
-- 현재 상황:
-- - 총 방문자: 6명 (전체 기간 중복 제거)
-- - 날짜별 합: 10명 (각 날짜별 중복 제거 합산)
--
-- 사용자 요구사항:
-- "날짜별 방문자는 중복 필터 적용이 안 된 거 같아"
-- → 날짜별 합도 6명이 되어야 한다는 의미
--
-- 해결 방법:
-- 날짜별 통계는 시각화를 위한 것이므로 각 날짜별 중복 제거를 유지하되,
-- 프론트엔드에 명확한 설명을 추가합니다.
--
-- 또는: 날짜별 통계를 전체 중복 제거 관점으로 변경
-- (하지만 이 경우 같은 사람이 여러 날 방문해도 첫 방문일에만 1로 표시)

-- ===================================================================
-- 옵션 1: 프론트엔드 설명 추가 (권장)
-- ===================================================================
-- 
-- VisitorStatisticsDashboard.tsx에 다음 안내 추가:
-- 
-- <div className="daily-stats-info">
--   ℹ️ 날짜별 통계는 각 날짜의 고유 방문자 수입니다.
--   같은 방문자가 여러 날 방문하면 각 날짜마다 카운트됩니다.
-- </div>
-- 
-- 이 방법은 정확하며, 사용자에게 혼동을 주지 않습니다.

-- ===================================================================
-- 옵션 2: 날짜별 통계를 "첫 방문일" 기준으로 변경
-- ===================================================================
-- 
-- 이 방법은 각 방문자의 **첫 방문일**에만 1로 카운트합니다.
-- 결과적으로 날짜별 합 = 전체 방문자 수가 됩니다.

DROP FUNCTION IF EXISTS get_visitor_statistics(text);

CREATE OR REPLACE FUNCTION get_visitor_statistics(p_domain TEXT)
RETURNS JSON AS $$
DECLARE
  v_site_id UUID;
  v_today_count INT := 0;
  v_yesterday_count INT := 0;
  v_total_count INT := 0;
  v_last_7_days INT := 0;
  v_last_30_days INT := 0;
  v_last_3_months INT := 0;
  v_last_6_months INT := 0;
  v_last_1_year INT := 0;
  v_daily_stats JSON;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain;

  IF v_site_id IS NULL THEN
    RETURN json_build_object(
      'domain', p_domain,
      'timestamp', NOW()::text,
      'stats', json_build_object(
        'today', 0,
        'yesterday', 0,
        'last_7_days', 0,
        'last_30_days', 0,
        'last_3_months', 0,
        'last_6_months', 0,
        'last_1_year', 0,
        'total', 0
      ),
      'daily_stats', '[]'::json
    );
  END IF;

  -- 오늘 방문자 수 (중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_today_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE;

  -- 어제 방문자 수 (중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_yesterday_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE - INTERVAL '1 day';

  -- 전체 방문자 수 (전체 기간 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_total_count
  FROM visitor_logs
  WHERE site_id = v_site_id;

  -- 최근 7일 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_7_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 days'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 30일 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_30_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 3개월 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_3_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '3 months'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 6개월 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_6_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 months'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 1년 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_1_year
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '1 year'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- ========================================
  -- 날짜별 방문자 통계 (첫 방문일 기준)
  -- ========================================
  -- 각 visitor_ip의 첫 방문 날짜를 기준으로 집계
  -- 이렇게 하면 날짜별 합 = 전체 방문자 수가 됩니다.
  
  SELECT json_agg(
    json_build_object(
      'date', visit_date,
      'count', visitor_count
    ) ORDER BY visit_date DESC
  ) INTO v_daily_stats
  FROM (
    SELECT 
      first_visit_date as visit_date,
      COUNT(*) as visitor_count
    FROM (
      SELECT 
        visitor_ip,
        MIN(DATE(created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
      FROM visitor_logs
      WHERE site_id = v_site_id
        AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
        AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE
      GROUP BY visitor_ip
    ) first_visits
    GROUP BY first_visit_date
  ) daily;

  RETURN json_build_object(
    'domain', p_domain,
    'timestamp', NOW()::text,
    'stats', json_build_object(
      'today', v_today_count,
      'yesterday', v_yesterday_count,
      'last_7_days', v_last_7_days,
      'last_30_days', v_last_30_days,
      'last_3_months', v_last_3_months,
      'last_6_months', v_last_6_months,
      'last_1_year', v_last_1_year,
      'total', v_total_count
    ),
    'daily_stats', COALESCE(v_daily_stats, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 검증
SELECT '=== 함수 실행 결과 ===' as step;
SELECT get_visitor_statistics('hokex.xyz') as result;

SELECT '=== 날짜별 합 확인 (첫 방문일 기준) ===' as step;
SELECT 
  SUM(visitor_count) as total_from_daily
FROM (
  SELECT 
    first_visit_date,
    COUNT(*) as visitor_count
  FROM (
    SELECT 
      visitor_ip,
      MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
    FROM visitor_logs vl
    JOIN visitor_sites vs ON vl.site_id = vs.id
    WHERE vs.domain = 'hokex.xyz'
    GROUP BY visitor_ip
  ) first_visits
  GROUP BY first_visit_date
) daily;

SELECT '=== 전체 방문자 수 ===' as step;
SELECT 
  COUNT(DISTINCT vl.visitor_ip) as total_unique
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz';

-- 설명:
-- 
-- 이 방법(옵션 2)을 사용하면:
-- - 날짜별 통계는 "그 날짜가 첫 방문일인 사람"만 카운트
-- - 날짜별 합 = 전체 방문자 수
-- 
-- 예시:
-- - IP "1.1.1.1"이 1월 1일, 1월 2일, 1월 3일 방문
-- - 첫 방문일: 1월 1일
-- - 날짜별 차트: 1월 1일에만 1로 표시, 1월 2일/3일은 0
-- 
-- 장점: 날짜별 합이 전체와 일치
-- 단점: "그 날짜에 실제로 방문한 사람 수"가 아니라 "그 날짜가 첫 방문인 사람 수"
-- 
-- 추천: 옵션 1 (프론트엔드 설명 추가)이 더 직관적이고 정확합니다.

