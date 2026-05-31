-- =====================================================
-- 공지사항 조회수 중복 방지 시스템
-- 하루에 한 번만 카운트 (팝업과 동일한 로직)
-- =====================================================

-- 1. 공지사항 조회 로그 테이블 생성
CREATE TABLE IF NOT EXISTS announcement_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL, -- localStorage의 visitorId
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성 (빠른 중복 체크)
CREATE INDEX IF NOT EXISTS idx_announcement_view_logs_announcement_visitor 
  ON announcement_view_logs(announcement_id, visitor_id);

CREATE INDEX IF NOT EXISTS idx_announcement_view_logs_viewed_at 
  ON announcement_view_logs(viewed_at);

-- 3. RLS 정책 (모든 사용자가 읽기/쓰기 가능)
ALTER TABLE announcement_view_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert announcement view logs" ON announcement_view_logs;
CREATE POLICY "Anyone can insert announcement view logs"
  ON announcement_view_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read announcement view logs" ON announcement_view_logs;
CREATE POLICY "Anyone can read announcement view logs"
  ON announcement_view_logs
  FOR SELECT
  TO public
  USING (true);

-- 4. 공지사항 조회수 증가 함수 (하루 1회 중복 방지)
CREATE OR REPLACE FUNCTION increment_announcement_view_count(
  p_announcement_id UUID,
  p_visitor_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_viewed BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- 오늘 이미 조회했는지 확인 (한국 시간 기준 자정)
  SELECT EXISTS (
    SELECT 1 
    FROM announcement_view_logs
    WHERE announcement_id = p_announcement_id
      AND visitor_id = p_visitor_id
      AND viewed_at >= (NOW() AT TIME ZONE 'Asia/Seoul')::DATE AT TIME ZONE 'Asia/Seoul'
  ) INTO v_already_viewed;

  -- 이미 조회한 경우 카운트 증가 없이 현재 값 반환
  IF v_already_viewed THEN
    SELECT view_count INTO v_new_count
    FROM announcements
    WHERE id = p_announcement_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_viewed', true,
      'view_count', COALESCE(v_new_count, 0)
    );
  END IF;

  -- 조회 로그 기록
  INSERT INTO announcement_view_logs (announcement_id, visitor_id)
  VALUES (p_announcement_id, p_visitor_id);

  -- 조회수 증가
  UPDATE announcements
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_announcement_id
  RETURNING view_count INTO v_new_count;

  RETURN jsonb_build_object(
    'success', true,
    'already_viewed', false,
    'view_count', v_new_count
  );
END;
$$;

-- 5. 오래된 로그 자동 삭제 (90일 이상)
CREATE OR REPLACE FUNCTION cleanup_old_announcement_view_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM announcement_view_logs
  WHERE viewed_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 6. 정리 작업 스케줄링 (매일 새벽 4시)
-- Supabase Dashboard에서 수동으로 설정하거나 pg_cron 사용
-- SELECT cron.schedule('cleanup-announcement-logs', '0 4 * * *', 'SELECT cleanup_old_announcement_view_logs()');

COMMENT ON TABLE announcement_view_logs IS '공지사항 조회 로그 (하루 1회 중복 방지)';
COMMENT ON FUNCTION increment_announcement_view_count IS '공지사항 조회수 증가 (하루 1회만 카운트)';
COMMENT ON FUNCTION cleanup_old_announcement_view_logs IS '90일 이상 된 공지사항 조회 로그 삭제';
