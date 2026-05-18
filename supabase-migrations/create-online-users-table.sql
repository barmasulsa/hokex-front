-- 현재 접속 중인 사용자 추적 테이블
CREATE TABLE IF NOT EXISTS online_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (빠른 조회)
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen);
CREATE INDEX IF NOT EXISTS idx_online_users_session_id ON online_users(session_id);

-- RLS 활성화
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can view online users"
  ON online_users
  FOR SELECT
  USING (true);

-- 모든 사용자가 자신의 세션 추가 가능
CREATE POLICY "Anyone can insert their session"
  ON online_users
  FOR INSERT
  WITH CHECK (true);

-- 모든 사용자가 자신의 세션 업데이트 가능
CREATE POLICY "Anyone can update their session"
  ON online_users
  FOR UPDATE
  USING (true);

-- 모든 사용자가 자신의 세션 삭제 가능
CREATE POLICY "Anyone can delete their session"
  ON online_users
  FOR DELETE
  USING (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE online_users;

-- 30초 이상 활동이 없는 세션 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM online_users
  WHERE last_seen < NOW() - INTERVAL '30 seconds';
END;
$$;

-- 주기적으로 실행할 수 있도록 준비 (pg_cron 사용 시)
-- SELECT cron.schedule('cleanup-inactive-sessions', '*/1 * * * *', 'SELECT cleanup_inactive_sessions()');

COMMENT ON TABLE online_users IS '현재 접속 중인 사용자 추적 (Realtime)';
COMMENT ON COLUMN online_users.session_id IS '브라우저 세션 고유 ID';
COMMENT ON COLUMN online_users.last_seen IS '마지막 활동 시간';
