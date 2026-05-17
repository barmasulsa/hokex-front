-- ============================================
-- 관리자 인증 시스템 마이그레이션
-- ============================================

-- 1. user_profiles 테이블 생성
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_profiles RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. user_profiles RLS 정책
-- 모든 인증된 사용자가 자신의 프로필 읽기 가능
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. events 테이블 기존 RLS 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Only admins can insert events" ON events;
DROP POLICY IF EXISTS "Only admins can update events" ON events;
DROP POLICY IF EXISTS "Only admins can delete events" ON events;

-- 5. events 테이블 RLS 활성화 (이미 되어있을 수 있음)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 6. events 테이블 새 RLS 정책
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

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 테스트 관리자 계정 생성 안내
-- ============================================
-- 
-- Supabase Dashboard에서 수동으로 생성:
-- 1. Authentication > Users > Add User
-- 2. 이메일/비밀번호 입력
-- 3. SQL Editor에서 실행:
--    INSERT INTO user_profiles (id, email, is_admin)
--    VALUES ('[생성된 user id]', '[이메일]', true);
--
-- ============================================
