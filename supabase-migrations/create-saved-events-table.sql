-- 저장된 행사 테이블 생성
CREATE TABLE IF NOT EXISTS saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 중복 방지: 한 사용자가 같은 행사를 여러 번 저장할 수 없음
  UNIQUE(user_id, event_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_created_at ON saved_events(created_at DESC);

-- RLS 정책 설정
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view their own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can save events" ON saved_events;
DROP POLICY IF EXISTS "Users can unsave events" ON saved_events;

-- 사용자는 자신의 저장 목록만 조회 가능
CREATE POLICY "Users can view their own saved events"
  ON saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 저장 목록에만 추가 가능
CREATE POLICY "Users can save events"
  ON saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 저장 목록에서만 삭제 가능
CREATE POLICY "Users can unsave events"
  ON saved_events
  FOR DELETE
  USING (auth.uid() = user_id);저장된 행사 테이블 생성
CREATE TABLE IF NOT EXISTS saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 중복 방지: 한 사용자가 같은 행사를 여러 번 저장할 수 없음
  UNIQUE(user_id, event_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_created_at ON saved_events(created_at DESC);

-- RLS 정책 설정
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view their own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can save events" ON saved_events;
DROP POLICY IF EXISTS "Users can unsave events" ON saved_events;

-- 사용자는 자신의 저장 목록만 조회 가능
CREATE POLICY "Users can view their own saved events"
  ON saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 저장 목록에만 추가 가능
CREATE POLICY "Users can save events"
  ON saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 저장 목록에서만 삭제 가능
CREATE POLICY "Users can unsave events"
  ON saved_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- 코멘트 추가
COMMENT ON TABLE saved_events IS '사용자가 저장한(찜한) 행사 목록';
COMMENT ON COLUMN saved_events.user_id IS '사용자 ID';
COMMENT ON COLUMN saved_events.event_id IS '행사 ID';
COMMENT ON COLUMN saved_events.created_at IS '저장한 시간';
