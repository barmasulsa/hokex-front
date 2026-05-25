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

-- 모든 사용자가 조회 로그를 읽을 수 있음
CREATE POLICY "Anyone can read event views log"
  ON event_views_log
  FOR SELECT
  USING (true);

-- 인증된 사용자만 조회 로그를 추가할 수 있음
CREATE POLICY "Authenticated users can insert event views log"
  ON event_views_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 관리자만 조회 로그를 삭제할 수 있음
CREATE POLICY "Only admins can delete event views log"
  ON event_views_log
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

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

COMMENT ON TABLE event_views_log IS '행사 조회 로그 - 언제, 누가 조회했는지 기록';
COMMENT ON COLUMN event_views_log.event_id IS '조회된 행사 ID';
COMMENT ON COLUMN event_views_log.viewed_at IS '조회 시각';
COMMENT ON COLUMN event_views_log.user_id IS '조회한 사용자 ID (로그인한 경우)';
COMMENT ON COLUMN event_views_log.ip_address IS '조회자 IP 주소';
COMMENT ON COLUMN event_views_log.user_agent IS '조회자 User Agent';
