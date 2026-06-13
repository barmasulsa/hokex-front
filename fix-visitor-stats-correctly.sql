-- 방문자 통계 완전 수정 (올바른 중복 제거 로직)
-- 
-- 문제:
-- 1. 총 방문자 6명인데 날짜별 방문자 합이 10명 (날짜별 중복 제거가 전체 중복 제거와 다름)
-- 2. 최근 7일/30일이 7명인데 총 방문자가 6명 (말이 안 됨)
-- 3. 최근 3개월/6개월/1년이 0명 (구현 안 됨)
--
-- 해결:
-- - 기간별 통계는 **해당 기간 내 전체 중복 제거**로 집계
-- - 날짜별 통계는 **날짜별 중복 제거** (시각화용)
-- - 총 방문자는 **전체 기간 중복 제거**

-- 1. 기존 함수 삭제
DROP FUNCTION IF EXISTS get_visitor_statistics(text);

-- 2. 새 함수 생성
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
    -- 사이트가 없으면 0 반환
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

  -- 오늘 방문자 수 (한국 시간, 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_today_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE;

  -- 어제 방문자 수 (한국 시간, 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_yesterday_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE - INTERVAL '1 day';

  -- 전체 방문자 수 (전체 기간 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_total_count
  FROM visitor_logs
  WHERE site_id = v_site_id;

  -- 최근 7일 방문자 수 (기간 내 전체 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_7_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 days'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 30일 방문자 수 (기간 내 전체 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_30_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 3개월 방문자 수 (기간 내 전체 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_3_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '3 months'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 6개월 방문자 수 (기간 내 전체 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_6_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 months'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 최근 1년 방문자 수 (기간 내 전체 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_1_year
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '1 year'
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

  -- 날짜별 방문자 통계 (최근 30일, 시각화용)
  -- 이 값은 날짜별 중복 제거이므로 합치면 전체 중복 제거 수와 다를 수 있음
  SELECT json_agg(
    json_build_object(
      'date', visit_date,
      'count', visitor_count
    ) ORDER BY visit_date DESC
  ) INTO v_daily_stats
  FROM (
    SELECT 
      DATE(created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
      COUNT(DISTINCT visitor_ip) as visitor_count
    FROM visitor_logs
    WHERE site_id = v_site_id
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
  ) daily;

  -- 결과 반환
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

-- 3. 검증 쿼리
SELECT '=== 함수 실행 결과 ===' as step;
SELECT get_visitor_statistics('hokex.xyz') as result;

SELECT '=== 검증: 전체 기간 중복 제거 ===' as step;
SELECT 
  COUNT(DISTINCT visitor_ip) as total_unique_visitors
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz';

SELECT '=== 검증: 최근 7일 중복 제거 ===' as step;
SELECT 
  COUNT(DISTINCT visitor_ip) as last_7_days_unique
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 days'
  AND DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE;

SELECT '=== 검증: 날짜별 방문자 (시각화용) ===' as step;
SELECT 
  DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(DISTINCT vl.visitor_ip) as unique_visitors_per_day,
  COUNT(*) as total_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visit_date DESC;

-- ==========================================
-- 설명
-- ==========================================
--
-- **중복 제거 로직**:
-- - 기간별 통계 (last_7_days, last_30_days 등): 해당 기간 전체에서 COUNT(DISTINCT visitor_ip)
-- - 날짜별 통계 (daily_stats): 각 날짜별로 COUNT(DISTINCT visitor_ip)
--
-- **왜 다른가?**:
-- - 같은 사람이 3일 동안 방문하면:
--   - 날짜별 합: 3명 (1+1+1)
--   - 기간별 전체: 1명 (중복 제거)
--
-- **올바른 표시**:
-- - "최근 7일 방문자": 6명 ← 기간 전체 중복 제거
-- - "날짜별 그래프": 각 날짜마다 다른 수 (시각화용)
--
-- **기대 결과** (일주일 안 지났고 총 방문자 6명인 경우):
-- - today: 오늘 방문한 사람 수
-- - yesterday: 어제 방문한 사람 수
-- - last_7_days: 6명 (전체와 동일)
-- - last_30_days: 6명 (전체와 동일)
-- - last_3_months: 6명 (전체와 동일)
-- - last_6_months: 6명 (전체와 동일)
-- - last_1_year: 6명 (전체와 동일)
-- - total: 6명
--
-- ==========================================
