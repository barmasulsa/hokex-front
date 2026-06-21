-- =====================================================
-- 커뮤니티 기능 빠른 수정 SQL
-- =====================================================
-- 진단 결과에 따라 필요한 부분만 실행하세요

-- =====================================================
-- 옵션 1: board_categories 테이블이 없는 경우
-- =====================================================
CREATE TABLE IF NOT EXISTS board_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 옵션 2: board_categories 데이터가 없는 경우
-- =====================================================
INSERT INTO board_categories (id, name, description, icon, "order") VALUES
  ('all', '전체', '모든 게시판', '📌', 0),
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1),
  ('promotion', '홍보게시판', '행사 및 제품 홍보', '📢', 2),
  ('job', '채용게시판', '정규직/계약직 채용', '💼', 3),
  ('staff', '스태프/단기알바', '행사 스태프 및 단기 알바', '👥', 4)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 옵션 3: RLS 정책 설정
-- =====================================================
-- RLS 활성화
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이름 충돌 방지)
DROP POLICY IF EXISTS "board_categories_select_all" ON board_categories;

-- 모든 사용자가 board_categories 읽기 가능하도록 설정
CREATE POLICY "board_categories_select_all" 
ON board_categories 
FOR SELECT 
USING (true);

-- =====================================================
-- 옵션 4: user_profiles 테이블이 없는 경우
-- =====================================================
-- 이미 존재할 수 있으므로 IF NOT EXISTS 사용
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_stibee_subscriber BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_profiles RLS 설정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_all" ON user_profiles;
CREATE POLICY "user_profiles_select_all" 
ON user_profiles 
FOR SELECT 
USING (true);

-- =====================================================
-- 검증: 설정이 제대로 되었는지 확인
-- =====================================================
SELECT '=== 검증: board_categories 조회 ===' as step;
SELECT * FROM board_categories ORDER BY "order";

SELECT '=== 검증: RLS 정책 확인 ===' as step;
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('board_categories', 'user_profiles');
