-- ============================================
-- 커스텀 날짜 범위 & 월별 방문자 통계 함수 추가
-- 사용자가 직접 날짜 범위를 지정하거나 월별로 조회 가능
-- ============================================

-- 1. 커스텀 날짜 범위 고유 방문자 통계 함수
CREATE OR REPLACE FUNCTION get_custom_date_range_visitors(
  p_start_date date,
  p_end_date date,
  p_domain text DEFAULT 'hokex.xyz'
)
RETURNS TABLE (
  start_date text,
  end_date text,
  unique_visitors bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 날짜 범위 검증
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  -- 한국 시간 기준으로 시작/종료 시각 설정
  v_start_time := (p_start_date::timestamptz AT TIME ZONE 'Asia/Seoul');
  v_end_time := ((p_end_date + INTERVAL '1 day')::timestamptz AT TIME ZONE 'Asia/Seoul');

  RETURN QUERY
  SELECT 
    TO_CHAR(p_start_date, 'YYYY-MM-DD') AS start_date,
    TO_CHAR(p_end_date, 'YYYY-MM-DD') AS end_date,
    COUNT(DISTINCT (vl.visitor_ip || '|' || COALESCE(vl.user_agent, '')))::bigint AS unique_visitors
  FROM visitor_logs vl
  WHERE vl.site_id = v_site_id
    AND vl.created_at >= v_start_time
    AND vl.created_at < v_end_time;
END;
$$;

-- 2. 특정 월의 고유 방문자 통계 함수
CREATE OR REPLACE FUNCTION get_monthly_unique_visitors(
  p_year int,
  p_month int,
  p_domain text DEFAULT 'hokex.xyz'
)
RETURNS TABLE (
  year int,
  month int,
  month_label text,
  unique_visitors bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id uuid;
  v_month_start timestamptz;
  v_month_end timestamptz;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 월 범위 검증
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12';
  END IF;

  -- 한국 시간 기준 월 시작/종료 시각
  v_month_start := date_trunc('month', make_date(p_year, p_month, 1)::timestamptz AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_month_end := v_month_start + INTERVAL '1 month';

  RETURN QUERY
  SELECT 
    p_year AS year,
    p_month AS month,
    TO_CHAR(v_month_start, 'YYYY년 MM월') AS month_label,
    COUNT(DISTINCT (vl.visitor_ip || '|' || COALESCE(vl.user_agent, '')))::bigint AS unique_visitors
  FROM visitor_logs vl
  WHERE vl.site_id = v_site_id
    AND vl.created_at >= v_month_start
    AND vl.created_at < v_month_end;
END;
$$;

-- 3. 특정 년도의 모든 월별 통계 조회 함수
CREATE OR REPLACE FUNCTION get_yearly_monthly_stats(
  p_year int,
  p_domain text DEFAULT 'hokex.xyz'
)
RETURNS TABLE (
  year int,
  month int,
  month_label text,
  unique_visitors bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id uuid;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  RETURN QUERY
  SELECT 
    p_year AS year,
    m.month_num AS month,
    TO_CHAR(make_date(p_year, m.month_num, 1), 'YYYY년 MM월') AS month_label,
    COALESCE(
      (
        SELECT COUNT(DISTINCT (vl.visitor_ip || '|' || COALESCE(vl.user_agent, '')))
        FROM visitor_logs vl
        WHERE vl.site_id = v_site_id
          AND EXTRACT(YEAR FROM vl.created_at AT TIME ZONE 'Asia/Seoul')::int = p_year
          AND EXTRACT(MONTH FROM vl.created_at AT TIME ZONE 'Asia/Seoul')::int = m.month_num
      ),
      0
    )::bigint AS unique_visitors
  FROM generate_series(1, 12) AS m(month_num)
  ORDER BY m.month_num;
END;
$$;

-- 4. 날짜별 고유 방문자 통계 (커스텀 날짜 범위용)
CREATE OR REPLACE FUNCTION get_daily_visitors_in_range(
  p_start_date date,
  p_end_date date,
  p_domain text DEFAULT 'hokex.xyz'
)
RETURNS TABLE (
  date text,
  count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id uuid;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 날짜 범위 검증
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  RETURN QUERY
  SELECT 
    TO_CHAR(d.date_val, 'YYYY-MM-DD') AS date,
    COALESCE(
      (
        SELECT COUNT(DISTINCT (vl.visitor_ip || '|' || COALESCE(vl.user_agent, '')))
        FROM visitor_logs vl
        WHERE vl.site_id = v_site_id
          AND (vl.created_at AT TIME ZONE 'Asia/Seoul')::date = d.date_val
      ),
      0
    )::bigint AS count
  FROM generate_series(
    p_start_date,
    p_end_date,
    '1 day'::interval
  ) AS d(date_val)
  ORDER BY d.date_val;
END;
$$;

-- 5. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_custom_date_range_visitors(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_unique_visitors(int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_yearly_monthly_stats(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_visitors_in_range(date, date, text) TO authenticated;

-- 6. 검증 쿼리
-- 예시 1: 2026년 1월 1일 ~ 2026년 1월 31일 고유 방문자
SELECT * FROM get_custom_date_range_visitors('2026-01-01', '2026-01-31', 'hokex.xyz');

-- 예시 2: 2026년 1월 월별 고유 방문자
SELECT * FROM get_monthly_unique_visitors(2026, 1, 'hokex.xyz');

-- 예시 3: 2026년 전체 월별 통계
SELECT * FROM get_yearly_monthly_stats(2026, 'hokex.xyz');

-- 예시 4: 2026년 6월 1일 ~ 6월 14일 날짜별 방문자
SELECT * FROM get_daily_visitors_in_range('2026-06-01', '2026-06-14', 'hokex.xyz');

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 커스텀 날짜 범위 & 월별 통계 함수가 성공적으로 생성되었습니다!';
  RAISE NOTICE '   - get_custom_date_range_visitors: 사용자 지정 기간 고유 방문자';
  RAISE NOTICE '   - get_monthly_unique_visitors: 특정 월 고유 방문자';
  RAISE NOTICE '   - get_yearly_monthly_stats: 특정 년도 전체 월별 통계';
  RAISE NOTICE '   - get_daily_visitors_in_range: 기간 내 날짜별 고유 방문자';
END $$;
