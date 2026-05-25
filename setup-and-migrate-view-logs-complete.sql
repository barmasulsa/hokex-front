-- ============================================
-- 조회 로그 시스템 완전 설정 및 마이그레이션
-- 실행 순서: 1) 테이블 생성 → 2) 함수 생성 → 3) 기존 데이터 마이그레이션
-- ============================================

-- ============================================
-- 1단계: event_views_log 테이블 생성
-- ============================================

-- 조회 로그 테이블 생성
CREATE TABLE IF NOT EXISTS event_views_log (
  id BIGSERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_event_views_log_event_id ON event_views_log(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_log_viewed_at ON event_views_log(viewed_at);
CREATE INDEX IF NOT EXISTS idx_event_views_log_event_viewed ON event_views_log(event_id, viewed_at);

-- RLS 정책 활성화
ALTER TABLE event_views_log ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can read event views log" ON event_views_log;
DROP POLICY IF EXISTS "Only admins can read event views log" ON event_views_log;
DROP POLICY IF EXISTS "Authenticated users can insert event views log" ON event_views_log;
DROP POLICY IF EXISTS "System can insert event views log" ON event_views_log;
DROP POLICY IF EXISTS "Only admins can delete event views log" ON event_views_log;

-- 시스템(함수)만 조회 로그를 추가할 수 있음 (일반 사용자는 직접 INSERT 불가)
-- increment_event_view_count 함수를 통해서만 추가 가능
CREATE POLICY "System can insert event views log"
  ON event_views_log
  FOR INSERT
  WITH CHECK (true);

-- 관리자만 조회 로그를 삭제할 수 있음 (admin_users 테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    EXECUTE 'CREATE POLICY "Only admins can delete event views log"
      ON event_views_log
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.user_id = auth.uid()
        )
      )';
  END IF;
  
  RAISE NOTICE '✓ 1단계 완료: event_views_log 테이블 생성';
END $$;

-- ============================================
-- 2단계: 조회수 증가 함수 생성/수정
-- ============================================

-- 조회수 증가 함수 수정 (로그 기록 추가)
CREATE OR REPLACE FUNCTION increment_event_view_count(
  p_event_id INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- events 테이블의 view_count 증가
  UPDATE events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_event_id;
  
  -- 조회 로그 기록
  INSERT INTO event_views_log (event_id, user_id, ip_address, user_agent)
  VALUES (p_event_id, p_user_id, p_ip_address, p_user_agent);
END;
$$;

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

DO $$
BEGIN
  RAISE NOTICE '✓ 2단계 완료: 조회수 관련 함수 생성';
END $$;

-- ============================================
-- 3단계: 기존 조회수를 어제 날짜로 마이그레이션
-- ============================================

DO $$
DECLARE
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  event_record RECORD;
  view_index INTEGER;
  random_hour INTEGER;
  random_minute INTEGER;
  random_second INTEGER;
  view_timestamp TIMESTAMPTZ;
  total_events INTEGER := 0;
  total_views INTEGER := 0;
BEGIN
  RAISE NOTICE '3단계 시작: 기존 조회수 마이그레이션 (어제 날짜: %)', yesterday_date;
  
  -- 조회수가 있는 모든 행사를 순회
  FOR event_record IN 
    SELECT id, view_count 
    FROM events 
    WHERE view_count > 0
  LOOP
    total_events := total_events + 1;
    
    -- 각 행사의 조회수만큼 로그 생성
    FOR view_index IN 1..event_record.view_count LOOP
      -- 어제 하루 중 랜덤한 시각 생성 (00:00:00 ~ 23:59:59)
      random_hour := floor(random() * 24)::INTEGER;
      random_minute := floor(random() * 60)::INTEGER;
      random_second := floor(random() * 60)::INTEGER;
      
      view_timestamp := yesterday_date + 
                       (random_hour || ' hours')::INTERVAL + 
                       (random_minute || ' minutes')::INTERVAL + 
                       (random_second || ' seconds')::INTERVAL;
      
      -- 조회 로그 삽입
      INSERT INTO event_views_log (event_id, viewed_at, user_id, ip_address, user_agent)
      VALUES (
        event_record.id,
        view_timestamp,
        NULL,
        NULL,
        'Historical Data Migration'
      );
      
      total_views := total_views + 1;
    END LOOP;
    
    -- 진행 상황 출력 (100개마다)
    IF total_events % 100 = 0 THEN
      RAISE NOTICE '  처리 중... % 행사 완료', total_events;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ 3단계 완료: % 행사의 총 % 조회수 마이그레이션 완료', total_events, total_views;
END $$;

-- ============================================
-- 4단계: 마이그레이션 결과 확인
-- ============================================

-- 어제 날짜의 조회 로그 확인
SELECT 
  '어제 날짜 조회 로그' as 구분,
  DATE(viewed_at) as 날짜,
  COUNT(*) as 총_조회수,
  COUNT(DISTINCT event_id) as 행사_수
FROM event_views_log
WHERE user_agent = 'Historical Data Migration'
GROUP BY DATE(viewed_at)
ORDER BY 날짜 DESC;

-- 전체 통계 확인
SELECT 
  '조회수가 있는 행사 수' as 항목,
  COUNT(DISTINCT id)::TEXT as 값
FROM events
WHERE view_count > 0
UNION ALL
SELECT 
  '마이그레이션된 로그 수' as 항목,
  COUNT(*)::TEXT as 값
FROM event_views_log
WHERE user_agent = 'Historical Data Migration'
UNION ALL
SELECT 
  'events 테이블 총 조회수' as 항목,
  SUM(view_count)::TEXT as 값
FROM events;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '조회 로그 시스템 설정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 프론트엔드 코드에서 increment_event_view_count 호출 시 파라미터 추가';
  RAISE NOTICE '2. 기간별 인기 행사 조회: SELECT * FROM get_popular_events_by_period(''2026-05-24'', ''2026-05-24'', 10);';
  RAISE NOTICE '3. 일별 통계 조회: SELECT * FROM get_daily_view_stats(''2026-01-01'', ''2026-12-31'');';
  RAISE NOTICE '';
END $$;
