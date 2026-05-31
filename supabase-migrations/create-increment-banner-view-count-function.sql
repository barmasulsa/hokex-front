-- 배너 조회수 증가 함수 생성
CREATE OR REPLACE FUNCTION increment_banner_view_count(banner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE banners
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    updated_at = NOW()
  WHERE id = banner_id;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION increment_banner_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_banner_view_count(uuid) TO anon;
