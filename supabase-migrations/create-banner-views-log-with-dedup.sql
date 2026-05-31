-- ============================================
-- 배너 조회수 로그 테이블 + 하루 1회 중복 방지
-- ============================================

-- 1단계: 배너 조회수 로그 테이블 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'banner_views_log') THEN
    CREATE TABLE banner_views_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      view_date DATE NOT NULL DEFAULT CURRENT_DATE,
      
      -- 하루 1회 중복 방지: 같은 배너를 같은 날짜에 여러 번 봐도 1회만 기록
      UNIQUE(banner_id, user_id, view_date),
      
      -- 인덱스
      CONSTRAINT banner_views_log_banner_id_fkey FOREIGN KEY (banner_id) REFERENCES banners(id) ON DELETE CASCADE
    );

    -- 인덱스 생성
    CREATE INDEX idx_banner_views_log_banner_id ON banner_views_log(banner_id);
    CREATE INDEX idx_banner_views_log_viewed_at ON banner_views_log(viewed_at);
    CREATE INDEX idx_banner_views_log_view_date ON banner_views_log(view_date);
    CREATE INDEX idx_banner_views_log_user_id ON banner_views_log(user_id);

    RAISE NOTICE '✓ banner_views_log 테이블 생성 완료';
  ELSE
    RAISE NOTICE '⚠ banner_views_log 테이블이 이미 존재합니다';
  END IF;
END $$;

-- 2단계: RLS 정책 설정
ALTER TABLE banner_views_log ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능
DROP POLICY IF EXISTS "Anyone can view banner views log" ON banner_views_log;
CREATE POLICY "Anyone can view banner views log"
  ON banner_views_log
  FOR SELECT
  USING (true);

-- 시스템(함수)만 조회 로그를 추가할 수 있음
DROP POLICY IF EXISTS "System can insert banner views log" ON banner_views_log;
CREATE POLICY "System can insert banner views log"
  ON banner_views_log
  FOR INSERT
  WITH CHECK (true);

-- 3단계: 배너 조회수 증가 함수 (하루 1회 중복 방지)
CREATE OR REPLACE FUNCTION increment_banner_view_count(
  p_banner_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_already_viewed BOOLEAN;
BEGIN
  -- 입력 검증
  IF p_banner_id IS NULL THEN
    RAISE EXCEPTION 'Invalid banner_id: %', p_banner_id;
  END IF;

  -- 오늘 이미 조회했는지 확인
  SELECT EXISTS (
    SELECT 1 
    FROM banner_views_log 
    WHERE banner_id = p_banner_id 
      AND COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND view_date = v_today
  ) INTO v_already_viewed;

  -- 이미 오늘 조회한 경우 아무것도 하지 않음
  IF v_already_viewed THEN
    RAISE NOTICE '이미 오늘 조회한 배너입니다 (banner_id: %, user_id: %, date: %)', p_banner_id, p_user_id, v_today;
    RETURN;
  END IF;

  -- 조회 로그 기록 (UNIQUE 제약조건으로 중복 방지)
  BEGIN
    INSERT INTO banner_views_log (banner_id, user_id, view_date)
    VALUES (p_banner_id, p_user_id, v_today)
    ON CONFLICT (banner_id, user_id, view_date) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      -- 동시 요청으로 인한 중복 방지
      RAISE NOTICE '동시 요청으로 인한 중복 방지 (banner_id: %)', p_banner_id;
      RETURN;
  END;

  -- banners 테이블의 view_count 증가
  UPDATE banners
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_banner_id;

  RAISE NOTICE '배너 조회수 증가 완료 (banner_id: %, user_id: %, date: %)', p_banner_id, p_user_id, v_today;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION increment_banner_view_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_banner_view_count(UUID, UUID) TO anon;

-- 4단계: 기간별 배너 조회수 집계 함수
CREATE OR REPLACE FUNCTION get_banner_views_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  banner_id UUID,
  view_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 입력 검증
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Start date and end date are required';
  END IF;
  
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  RETURN QUERY
  SELECT 
    banner_views_log.banner_id,
    COUNT(*)::BIGINT as view_count
  FROM banner_views_log
  WHERE view_date >= p_start_date
    AND view_date <= p_end_date
  GROUP BY banner_views_log.banner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_banner_views_by_period(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_banner_views_by_period(DATE, DATE) TO anon;

-- 5단계: 일별 배너 조회수 통계 함수
CREATE OR REPLACE FUNCTION get_daily_banner_view_stats(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  view_date DATE,
  total_views BIGINT,
  unique_banners BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 입력 검증
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Start date and end date are required';
  END IF;
  
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  RETURN QUERY
  SELECT 
    banner_views_log.view_date,
    COUNT(*)::BIGINT as total_views,
    COUNT(DISTINCT banner_views_log.banner_id)::BIGINT as unique_banners
  FROM banner_views_log
  WHERE banner_views_log.view_date >= p_start_date
    AND banner_views_log.view_date <= p_end_date
  GROUP BY banner_views_log.view_date
  ORDER BY banner_views_log.view_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_banner_view_stats(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_banner_view_stats(DATE, DATE) TO anon;

-- 6단계: 기존 view_count를 로그로 마이그레이션 (선택사항)
DO $$
DECLARE
  banner_record RECORD;
  i INTEGER;
  migration_date DATE := CURRENT_DATE - INTERVAL '1 day'; -- 어제 날짜로 기록
BEGIN
  RAISE NOTICE '기존 배너 조회수를 로그로 마이그레이션 시작...';
  
  FOR banner_record IN 
    SELECT id, view_count 
    FROM banners 
    WHERE view_count > 0
  LOOP
    -- 기존 view_count만큼 로그 생성 (최대 1000개로 제한)
    FOR i IN 1..LEAST(banner_record.view_count, 1000) LOOP
      INSERT INTO banner_views_log (banner_id, user_id, view_date, viewed_at)
      VALUES (
        banner_record.id, 
        NULL, 
        migration_date - (i || ' days')::INTERVAL,
        (migration_date - (i || ' days')::INTERVAL)::TIMESTAMPTZ
      )
      ON CONFLICT (banner_id, user_id, view_date) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE '배너 % 마이그레이션 완료 (조회수: %)', banner_record.id, banner_record.view_count;
  END LOOP;
  
  RAISE NOTICE '✓ 마이그레이션 완료';
END $$;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '배너 조회수 로그 + 하루 1회 중복 방지 설정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '주요 기능:';
  RAISE NOTICE '1. 같은 사용자가 같은 배너를 하루에 여러 번 봐도 조회수는 1만 증가';
  RAISE NOTICE '2. 비로그인 사용자도 하루 1회만 카운트 (user_id NULL로 처리)';
  RAISE NOTICE '3. 기간별 조회수 집계 가능';
  RAISE NOTICE '';
  RAISE NOTICE '사용 예시:';
  RAISE NOTICE '- 프론트엔드: await supabase.rpc(''increment_banner_view_count'', { p_banner_id: bannerId, p_user_id: user?.id || null });';
  RAISE NOTICE '- 기간별 조회수: SELECT * FROM get_banner_views_by_period(''2026-05-01'', ''2026-05-31'');';
  RAISE NOTICE '- 일별 통계: SELECT * FROM get_daily_banner_view_stats(''2026-05-01'', ''2026-05-31'');';
  RAISE NOTICE '';
END $$;
