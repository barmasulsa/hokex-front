-- 커뮤니티 기능 데이터베이스 테이블 생성
-- 실행 순서: board_categories → posts → comments → likes → reports

-- =====================================================
-- 1. 게시판 카테고리 테이블
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

-- 기본 게시판 카테고리 데이터 삽입
INSERT INTO board_categories (id, name, description, icon, "order") VALUES
  ('all', '전체', '모든 게시판', '📌', 0),
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1),
  ('promotion', '홍보게시판', '행사 및 제품 홍보', '📢', 2),
  ('job', '채용게시판', '정규직/계약직 채용', '💼', 3),
  ('staff', '스태프/단기알바', '행사 스태프 및 단기 알바', '👥', 4)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. 게시글 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_category_id TEXT NOT NULL REFERENCES board_categories(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 5000),
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_board_category ON posts(board_category_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);

-- =====================================================
-- 3. 댓글 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  like_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- =====================================================
-- 4. 좋아요 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);

-- =====================================================
-- 5. 신고 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10 AND char_length(reason) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- =====================================================
-- 6. RLS (Row Level Security) 정책 설정
-- =====================================================

-- board_categories: 모든 사용자 읽기 가능
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_categories_select_all" ON board_categories FOR SELECT USING (true);

-- posts: 삭제되지 않은 게시글은 모두 읽기 가능
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select_not_deleted" ON posts FOR SELECT USING (is_deleted = false);
CREATE POLICY "posts_insert_authenticated" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);

-- comments: 삭제되지 않은 댓글은 모두 읽기 가능
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_not_deleted" ON comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "comments_insert_authenticated" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (auth.uid() = user_id);

-- likes: 자신의 좋아요만 조회/생성/삭제 가능
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_own" ON likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid() = user_id);

-- reports: 자신의 신고만 조회 가능, 관리자는 모든 신고 조회 가능
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_own" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_insert_authenticated" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- =====================================================
-- 7. 트리거 함수: updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- posts 테이블 트리거
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- comments 테이블 트리거
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. 트리거 함수: 댓글 수 자동 업데이트
-- =====================================================
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- =====================================================
-- 9. 트리거 함수: 좋아요 수 자동 업데이트
-- =====================================================
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_like_count ON likes;
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_like_count();

-- =====================================================
-- 완료 메시지
-- =====================================================
-- 마이그레이션 완료
