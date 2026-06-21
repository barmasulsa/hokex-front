-- =====================================================
-- 커뮤니티 공지사항 기능 추가
-- =====================================================
-- posts 테이블에 is_notice 필드 추가

-- 1. posts 테이블에 is_notice 컬럼 추가
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_notice BOOLEAN NOT NULL DEFAULT false;

-- 2. 공지사항용 인덱스 추가 (공지사항 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_posts_is_notice ON posts(is_notice, created_at DESC);

-- 3. 공지사항 정렬을 위한 고정 순서 필드 추가 (선택사항)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS notice_order INTEGER DEFAULT 0;

-- 4. notice_order 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_posts_notice_order ON posts(notice_order DESC) WHERE is_notice = true;

COMMENT ON COLUMN posts.is_notice IS '커뮤니티 공지사항 여부 (true: 공지사항, false: 일반 게시글)';
COMMENT ON COLUMN posts.notice_order IS '공지사항 고정 순서 (숫자가 클수록 상단 노출, 0은 일반 공지)';

-- =====================================================
-- 완료
-- =====================================================
-- 커뮤니티 공지사항 기능이 추가되었습니다.
-- 
-- 사용 방법:
-- 1. 공지사항 등록: INSERT INTO posts (..., is_notice) VALUES (..., true)
-- 2. 공지사항 조회: SELECT * FROM posts WHERE is_notice = true ORDER BY notice_order DESC, created_at DESC
-- 3. 일반 게시글 조회: SELECT * FROM posts WHERE is_notice = false ORDER BY created_at DESC
-- 4. 전체 조회 (공지 먼저): SELECT * FROM posts ORDER BY is_notice DESC, notice_order DESC, created_at DESC
