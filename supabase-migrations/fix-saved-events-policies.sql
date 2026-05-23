-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view their own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can save events" ON saved_events;
DROP POLICY IF EXISTS "Users can unsave events" ON saved_events;

-- RLS 정책 다시 생성
CREATE POLICY "Users can view their own saved events"
  ON saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save events"
  ON saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave events"
  ON saved_events
  FOR DELETE
  USING (auth.uid() = user_id);
