-- 기간별 조회수 집계 함수 (지역/전시장 필터 추가)
CREATE OR REPLACE FUNCTION get_event_views_by_period(
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 50,
  p_region TEXT DEFAULT NULL,
  p_venue TEXT DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  venue TEXT,
  region TEXT,
  start_date DATE,
  end_date DATE,
  view_count BIGINT,
  poster_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 입력 검증
  IF p_start_date IS NULL THEN
    p_start_date := '2020-01-01';
  END IF;
  
  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_DATE + INTERVAL '10 years';
  END IF;

  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title,
    e.venue,
    e.region,
    e.start_date,
    e.end_date,
    COUNT(evl.id)::BIGINT as view_count,
    e.poster_url
  FROM events e
  LEFT JOIN event_views_log evl ON e.id = evl.event_id
    AND evl.viewed_at >= p_start_date::TIMESTAMPTZ
    AND evl.viewed_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  WHERE e.deleted_at IS NULL  -- 삭제되지 않은 행사만
    AND (p_region IS NULL OR e.region = p_region)  -- 지역 필터
    AND (p_venue IS NULL OR e.venue = p_venue)     -- 전시장 필터
  GROUP BY e.id, e.title, e.venue, e.region, e.start_date, e.end_date, e.poster_url
  HAVING COUNT(evl.id) > 0
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$;

-- 테스트: 어제 날짜로 조회 (마이그레이션된 데이터 확인)
SELECT * FROM get_event_views_by_period(
  (CURRENT_DATE - INTERVAL '1 day')::DATE,  -- 어제 (DATE 타입으로 캐스팅)
  (CURRENT_DATE - INTERVAL '1 day')::DATE,  -- 어제 (DATE 타입으로 캐스팅)
  10,
  NULL,  -- 전체 지역
  NULL   -- 전체 전시장
);

-- 테스트: 최근 7일 조회
SELECT * FROM get_event_views_by_period(
  (CURRENT_DATE - INTERVAL '7 days')::DATE,
  CURRENT_DATE,
  10,
  NULL,
  NULL
);
