-- 커뮤니티 기능을 위한 RPC 함수들

-- =====================================================
-- 1. 게시글 조회수 증가 함수
-- =====================================================
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts 
  SET view_count = view_count + 1 
  WHERE id = post_id AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 완료
-- =====================================================
