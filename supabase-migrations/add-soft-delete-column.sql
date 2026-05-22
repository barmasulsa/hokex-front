-- 소프트 삭제를 위한 deleted_at 컬럼 추가
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- deleted_at 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- 기존 RLS 정책 업데이트: deleted_at이 NULL인 것만 조회
DROP POLICY IF EXISTS "Anyone can view events" ON events;
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT
  USING (deleted_at IS NULL);

-- 관리자는 삭제된 행사도 볼 수 있도록 별도 정책 추가
CREATE POLICY "Admins can view deleted events" ON events
  FOR SELECT
  USING (
    deleted_at IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_admin = true
    )
  );

COMMENT ON COLUMN events.deleted_at IS '소프트 삭제 시간 (NULL이면 활성 상태)';
