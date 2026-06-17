-- ============================================
-- 방문자 통계 로직 수정
-- 문제: 날짜별/시간대별 방문자가 중복 카운트됨
-- 해결: visitor_logs 대신 실제 고유 방문자를 카운트하는 로직 적용
-- ============================================

-- 1. 시간대별 고유 방문자 통계 함수 생성
CREATE OR REPLACE FUNCTION get_hourly_unique_visitors(
  p_domain text DEFAULT 'hokex.xyz'
)
RETURNS TABLE (
  hour int,
  count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id int;
  v_today_start timestamptz;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 오늘 시작 시각 (한국 시간 기준 00:00)
  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  RETURN QUERY
  SELECT 
    h.hour_num AS hour,
    COALESCE(
      (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs vl
        WHERE vl.site_id = v_site_id
          AND vl.created_at >= v_today_start
          AND vl.created_at < v_today_start + INTERVAL '1 day'
          AND EXTRACT(HOUR FROM vl.created_at AT TIME ZONE 'Asia/Seoul')::int = h.hour_num
      ),
      0
    ) AS count
  FROM generate_series(0, 23) AS h(hour_num)
  ORDER BY h.hour_num;
END;
$$;

-- 2. 날짜별 고유 방문자 통계 함수 생성
CREATE OR REPLACE FUNCTION get_daily_unique_visitors(
  p_domain text DEFAULT 'hokex.xyz',
  p_days int DEFAULT 30
)
RETURNS TABLE (
  date text,
  count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id int;
  v_start_date date;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 시작 날짜 계산 (한국 시간 기준)
  v_start_date := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - (p_days - 1) * INTERVAL '1 day')::date;

  RETURN QUERY
  SELECT 
    TO_CHAR(d.date_val, 'YYYY-MM-DD') AS date,
    COALESCE(
      (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs vl
        WHERE vl.site_id = v_site_id
          AND (vl.created_at AT TIME ZONE 'Asia/Seoul')::date = d.date_val
      ),
      0
    ) AS count
  FROM generate_series(
    v_start_date,
    CURRENT_DATE AT TIME ZONE 'Asia/Seoul',
    '1 day'::interval
  ) AS d(date_val)
  ORDER BY d.date_val;
END;
$$;

-- 3. 기존 get_visitor_statistics 함수 수정 (고유 방문자 기준)
CREATE OR REPLACE FUNCTION get_visitor_statistics(p_domain text DEFAULT 'hokex.xyz')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id int;
  v_result json;
  v_today_start timestamptz;
  v_yesterday_start timestamptz;
BEGIN
  -- 사이트 ID 조회
  SELECT id INTO v_site_id
  FROM visitor_sites
  WHERE domain = p_domain
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site not found: %', p_domain;
  END IF;

  -- 한국 시간 기준 오늘/어제 시작 시각
  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_yesterday_start := v_today_start - INTERVAL '1 day';

  -- 고유 방문자 기준 통계 생성
  SELECT json_build_object(
    'domain', p_domain,
    'timestamp', now(),
    'stats', json_build_object(
      -- 오늘 고유 방문자
      'today', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start
          AND created_at < v_today_start + INTERVAL '1 day'
      ),
      -- 어제 고유 방문자
      'yesterday', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_yesterday_start
          AND created_at < v_today_start
      ),
      -- 최근 7일 고유 방문자
      'last_7_days', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start - INTERVAL '7 days'
      ),
      -- 최근 30일 고유 방문자
      'last_30_days', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start - INTERVAL '30 days'
      ),
      -- 최근 3개월 고유 방문자
      'last_3_months', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start - INTERVAL '3 months'
      ),
      -- 최근 6개월 고유 방문자
      'last_6_months', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start - INTERVAL '6 months'
      ),
      -- 최근 1년 고유 방문자
      'last_1_year', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
          AND created_at >= v_today_start - INTERVAL '1 year'
      ),
      -- 전체 고유 방문자
      'total', (
        SELECT COUNT(DISTINCT fingerprint)
        FROM visitor_logs
        WHERE site_id = v_site_id
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 4. RLS 정책 확인 및 수정
-- 관리자만 접근 가능하도록 설정
DO $$
BEGIN
  -- visitor_logs 테이블에 SELECT 정책이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'visitor_logs' AND policyname = 'Allow admin to view all logs'
  ) THEN
    CREATE POLICY "Allow admin to view all logs"
      ON visitor_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.email = 'cjfthdhkd@gmail.com'
        )
      );
  END IF;
END $$;

-- 5. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_hourly_unique_visitors(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_unique_visitors(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_visitor_statistics(text) TO authenticated;

-- 6. 검증 쿼리
-- 오늘 고유 방문자 수 확인
SELECT 
  '오늘 고유 방문자' as label,
  COUNT(DISTINCT fingerprint) as count
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

-- 시간대별 고유 방문자 확인
SELECT * FROM get_hourly_unique_visitors('hokex.xyz') ORDER BY hour;

-- 날짜별 고유 방문자 확인 (최근 7일)
SELECT * FROM get_daily_unique_visitors('hokex.xyz', 7) ORDER BY date;

-- 전체 통계 확인
SELECT get_visitor_statistics('hokex.xyz');
