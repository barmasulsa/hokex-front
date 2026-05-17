-- ============================================
-- user_profiles 테이블에 is_admin 컬럼 추가
-- ============================================

-- 1. is_admin 컬럼 추가 (이미 있으면 무시됨)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. updated_at 컬럼 추가 (없다면)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. user_profiles RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 기존 RLS 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- 5. user_profiles RLS 정책 재생성
-- 모든 인증된 사용자가 자신의 프로필 읽기 가능
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 6. events 테이블 기존 RLS 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Only admins can insert events" ON events;
DROP POLICY IF EXISTS "Only admins can update events" ON events;
DROP POLICY IF EXISTS "Only admins can delete events" ON events;

-- 7. events 테이블 RLS 활성화
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 8. events 테이블 새 RLS 정책
-- 읽기: 모두 허용 (인증 불필요)
CREATE POLICY "Anyone can read events"
  ON events FOR SELECT
  USING (true);

-- 쓰기: 관리자만 허용
CREATE POLICY "Only admins can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

-- 9. updated_at 자동 업데이트 트리거 (없다면 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
