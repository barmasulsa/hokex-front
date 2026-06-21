-- =====================================================
-- 배너 공지사항 카테고리 필드 추가
-- =====================================================
-- 배너 테이블에 announcement_category 필드 추가하여
-- "홈페이지 공지사항"과 "커뮤니티 공지사항"을 구분

-- 1. announcement_category 컬럼 추가
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS announcement_category TEXT DEFAULT 'homepage';

-- 2. CHECK 제약조건 추가 (유효한 값만 허용)
ALTER TABLE banners
ADD CONSTRAINT banners_announcement_category_check 
CHECK (announcement_category IN ('homepage', 'community'));

-- 3. 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_banners_announcement_category 
ON banners(announcement_category, type, is_active);

-- 4. 기존 배너는 모두 'homepage'로 설정 (이미 DEFAULT로 설정됨)
UPDATE banners 
SET announcement_category = 'homepage' 
WHERE announcement_category IS NULL;

COMMENT ON COLUMN banners.announcement_category IS '배너 공지사항 카테고리 (homepage: 홈페이지용, community: 커뮤니티용)';

-- =====================================================
-- 완료
-- =====================================================
-- 배너 테이블에 announcement_category 필드가 추가되었습니다.
-- 
-- 사용 방법:
-- - 홈페이지 배너: announcement_category = 'homepage'
-- - 커뮤니티 배너: announcement_category = 'community'
-- 
-- 예시:
-- SELECT * FROM banners WHERE type = 'image' AND announcement_category = 'homepage';
-- SELECT * FROM banners WHERE type = 'text' AND announcement_category = 'community';
