-- 방문자 통계 기간별 집계 수정
-- 문제: 기간별 방문자 통계가 제대로 반영되지 않음 (예: 6월 10일 7명인데 오늘 1명만 표시)
-- 해결: 실제 날짜별 방문자 수를 정확히 집계하도록 수정

-- 1. 현재 상태 확인
SELECT 
  '=== 현재 visitor_logs 날짜별 통계 ===' as step,
  DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(DISTINCT vl.visitor_ip) as unique_visitors,
  COUNT(*) as total_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visit_date DESC;

-- 2. get_visitor_statistics 함수 수정 (기간별 통계 완전 수정)
-- 먼저 기존 함수 삭제
DROP FUNCTION IF EXISTS get_visitor_statistics(text);

-- 새로 생성
CREATE FUNCTION get_visitor_statistics(p_domain TEXT)
RETURNS JSON AS $$
DECLARE
  v_site_id UUID;
  v_today_count INT := 0;
  v_yesterday_count INT := 0;
  v_total_count INT := 0;
  v_last_7_days INT := 0;
  v_last_30_days INT := 0;
  v_daily_stats JSON;
  v_result JSON;
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

  -- 오늘 방문자 수 (한국 시간 기준, 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_today_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE;

  -- 어제 방문자 수 (한국 시간 기준, 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_yesterday_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE - INTERVAL '1 day';

  -- 전체 방문자 수 (전체 기간 중복 제거)
  SELECT COUNT(DISTINCT visitor_ip) INTO v_total_count
  FROM visitor_logs
  WHERE site_id = v_site_id;

  -- 최근 7일 방문자 수 (날짜별 합산)
  -- 예: 6월 10일 7명 + 6월 11일 3명 + ... = 총합
  SELECT COALESCE(SUM(daily_count), 0) INTO v_last_7_days
  FROM (
    SELECT COUNT(DISTINCT visitor_ip) as daily_count
    FROM visitor_logs
    WHERE site_id = v_site_id
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '6 days'
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
  ) daily_counts;

  -- 최근 30일 방문자 수 (날짜별 합산)
  SELECT COALESCE(SUM(daily_count), 0) INTO v_last_30_days
  FROM (
    SELECT COUNT(DISTINCT visitor_ip) as daily_count
    FROM visitor_logs
    WHERE site_id = v_site_id
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE - INTERVAL '29 days'
      AND DATE(created_at AT TIME ZONE 'Asia/Seoul') <= CURRENT_DATE
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
  ) daily_counts;

  -- 날짜별 방문자 통계 (최근 30일, 한국 시간 기준)
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

  -- 결과 반환 (프론트엔드가 기대하는 구조에 맞춤)
  RETURN json_build_object(
    'domain', p_domain,
    'timestamp', NOW()::text,
    'stats', json_build_object(
      'today', v_today_count,
      'yesterday', v_yesterday_count,
      'last_7_days', v_last_7_days,
      'last_30_days', v_last_30_days,
      'last_3_months', 0,
      'last_6_months', 0,
      'last_1_year', 0,
      'total', v_total_count
    ),
    'daily_stats', COALESCE(v_daily_stats, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 수정된 함수 테스트
SELECT 
  '=== 수정된 get_visitor_statistics 결과 ===' as step,
  get_visitor_statistics('hokex.xyz') as statistics;

-- 4. 날짜별 상세 확인 (최근 7일)
SELECT 
  '=== 최근 7일 날짜별 상세 ===' as step,
  DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') as visit_date,
  COUNT(DISTINCT vl.visitor_ip) as unique_visitors,
  COUNT(*) as total_visits,
  array_agg(DISTINCT LEFT(vl.visitor_ip, 12) || '...') as ip_samples
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(vl.created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY visit_date DESC;

-- 5. 검증: 6월 10일 데이터 확인
SELECT 
  '=== 6월 10일 방문자 상세 ===' as step,
  vl.created_at AT TIME ZONE 'Asia/Seoul' as visit_time,
  LEFT(vl.visitor_ip, 15) || '...' as visitor_ip_preview,
  LEFT(vl.user_agent, 80) as user_agent_preview
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND DATE(vl.created_at AT TIME ZONE 'Asia/Seoul') = '2026-06-10'
ORDER BY vl.created_at;

-- ==========================================
-- 결과 확인 방법:
-- ==========================================
-- 
-- 1. 첫 번째 쿼리: 실제 날짜별 방문자 수가 표시됩니다
--    예: 
--    - 2026-06-10: 7명 (unique_visitors)
--    - 2026-06-13: 1명 (unique_visitors)
--
-- 2. 세 번째 쿼리: 수정된 함수가 반환하는 JSON
--    - today: 오늘(6월 13일) 방문자 수
--    - last_7_days: 최근 7일 총 방문자 수 (중복 제거)
--    - daily_stats: 날짜별 배열 데이터
--
-- 3. 네 번째 쿼리: 최근 7일 날짜별 상세
--    - 각 날짜의 unique_visitors가 제대로 표시되는지 확인
--
-- 4. 다섯 번째 쿼리: 6월 10일의 실제 방문 기록
--    - 7명의 IP가 실제로 있는지 확인
--
-- ==========================================
-- 주의사항:
-- ==========================================
--
-- - 이 수정은 visitor_logs 테이블의 실제 데이터를 기반으로 집계합니다
-- - visitor_sites 테이블의 today_count, total_count는 사용하지 않습니다
-- - 중복 제거는 IP 주소 기준으로 수행됩니다
-- - 한국 시간(Asia/Seoul) 기준으로 날짜를 구분합니다
--
-- ==========================================
