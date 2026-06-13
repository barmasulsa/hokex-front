-- 날짜별 방문자 통계를 "첫 방문일" 기준으로 변경
-- 
-- 목표: 날짜별 합 = 전체 방문자 수
-- 
-- 방법: 각 visitor_ip의 첫 방문 날짜에만 1로 카운트

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

  -- 전체 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_total_count
  FROM visitor_logs
  WHERE site_id = v_site_id;

  -- 최근 7일 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_7_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 days';

  -- 최근 30일 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_30_days
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days';

  -- 최근 3개월 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_3_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '3 months';

  -- 최근 6개월 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_6_months
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 months';

  -- 최근 1년 방문자 수
  SELECT COUNT(DISTINCT visitor_ip) INTO v_last_1_year
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '1 year';

  -- ========================================
  -- 날짜별 방문자 통계 (첫 방문일 기준)
  -- ========================================
  -- 각 IP의 첫 방문 날짜를 기준으로 집계
  -- 이렇게 하면 날짜별 합 = 전체 방문자 수
  
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
SELECT '=== 새 함수 실행 결과 ===' as step;
SELECT get_visitor_statistics('hokex.xyz') as result;

SELECT '=== 검증: 날짜별 합 vs 전체 방문자 ===' as step;
WITH first_visits AS (
  SELECT 
    vl.visitor_ip,
    MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY vl.visitor_ip
),
daily_counts AS (
  SELECT 
    first_visit_date,
    COUNT(*) as daily_first_visitors
  FROM first_visits
  GROUP BY first_visit_date
)
SELECT 
  (SELECT SUM(daily_first_visitors) FROM daily_counts) as sum_of_daily,
  (SELECT COUNT(DISTINCT visitor_ip) FROM visitor_logs vl JOIN visitor_sites vs ON vl.site_id = vs.id WHERE vs.domain = 'hokex.xyz') as total_unique,
  CASE 
    WHEN (SELECT SUM(daily_first_visitors) FROM daily_counts) = (SELECT COUNT(DISTINCT visitor_ip) FROM visitor_logs vl JOIN visitor_sites vs ON vl.site_id = vs.id WHERE vs.domain = 'hokex.xyz')
    THEN '✅ 일치!'
    ELSE '❌ 불일치'
  END as status;

SELECT '=== 날짜별 첫 방문자 분포 ===' as step;
SELECT 
  first_visit_date,
  COUNT(*) as new_visitors,
  array_agg(visitor_ip) as visitor_ips
FROM (
  SELECT 
    vl.visitor_ip,
    MIN(DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')) as first_visit_date
  FROM visitor_logs vl
  JOIN visitor_sites vs ON vl.site_id = vs.id
  WHERE vs.domain = 'hokex.xyz'
  GROUP BY vl.visitor_ip
) first_visits
GROUP BY first_visit_date
ORDER BY first_visit_date DESC;

-- 이 SQL을 Supabase SQL Editor에서 실행하세요.
-- 
-- 예상 결과:
-- - 날짜별 합 = 전체 방문자 수 (6명)
-- - 각 날짜는 "그 날짜가 첫 방문인 사람"만 표시
-- 
-- 예시:
-- 2026-01-01: 3명 (첫 방문)
-- 2026-01-02: 2명 (첫 방문)
-- 2026-01-03: 1명 (첫 방문)
-- → 합: 6명 = 전체 방문자
