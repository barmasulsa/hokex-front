-- visitor_stats_cache 테이블에 기간별 통계 함수 추가

-- 기간별 조회수 집계 함수
CREATE OR REPLACE FUNCTION get_event_views_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  event_id INTEGER,
  view_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    event_views_log.event_id,
    COUNT(*)::BIGINT as view_count
  FROM event_views_log
  WHERE viewed_at >= p_start_date::TIMESTAMPTZ
    AND viewed_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY event_views_log.event_id;
END;
$$;

-- 기간별 인기 행사 조회 함수
CREATE OR REPLACE FUNCTION get_popular_events_by_period(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_id INTEGER,
  title TEXT,
  venue TEXT,
  start_date DATE,
  end_date DATE,
  view_count BIGINT,
  poster_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 기간이 지정되지 않으면 전체 기간
  IF p_start_date IS NULL THEN
    p_start_date := '2020-01-01'::DATE;
  END IF;
  
  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_DATE + INTERVAL '10 years';
  END IF;

  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title,
    e.venue,
    e.start_date,
    e.end_date,
    COUNT(evl.id)::BIGINT as view_count,
    e.poster_url
  FROM events e
  LEFT JOIN event_views_log evl ON e.id = evl.event_id
    AND evl.viewed_at >= p_start_date::TIMESTAMPTZ
    AND evl.viewed_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY e.id, e.title, e.venue, e.start_date, e.end_date, e.poster_url
  HAVING COUNT(evl.id) > 0
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$;

-- 일별 조회수 통계 함수
CREATE OR REPLACE FUNCTION get_daily_view_stats(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  view_date DATE,
  total_views BIGINT,
  unique_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(viewed_at) as view_date,
    COUNT(*)::BIGINT as total_views,
    COUNT(DISTINCT event_id)::BIGINT as unique_events
  FROM event_views_log
  WHERE viewed_at >= p_start_date::TIMESTAMPTZ
    AND viewed_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY DATE(viewed_at)
  ORDER BY view_date;
END;
$$;

COMMENT ON FUNCTION get_event_views_by_period IS '특정 기간 동안의 행사별 조회수 집계';
COMMENT ON FUNCTION get_popular_events_by_period IS '특정 기간 동안의 인기 행사 목록 조회';
COMMENT ON FUNCTION get_daily_view_stats IS '일별 조회수 통계';
