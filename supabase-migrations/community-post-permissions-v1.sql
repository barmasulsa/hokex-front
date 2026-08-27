-- Community post ownership: author may edit/delete; an administrator may delete any post.
CREATE OR REPLACE VIEW public.community_posts_public AS
SELECT id, title, content, board_category_id, author_nickname, created_at, updated_at, view_count, like_count, comment_count, is_pinned, post_number, author_id
FROM public.community_posts;
GRANT SELECT ON public.community_posts_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_community_post(p_post_id uuid, p_title text, p_content text, p_board_category_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id AND author_id = auth.uid()) THEN
    RAISE EXCEPTION '작성자만 게시글을 수정할 수 있습니다.';
  END IF;
  UPDATE public.community_posts
  SET title = trim(p_title), content = trim(p_content), board_category_id = p_board_category_id
  WHERE id = p_post_id;
END; $$;
REVOKE ALL ON FUNCTION public.update_community_post(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_community_post(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_community_post(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts post
    WHERE post.id = p_post_id AND (
      post.author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_profiles profile WHERE profile.id = auth.uid() AND profile.is_admin = true)
    )
  ) THEN
    RAISE EXCEPTION '작성자 또는 관리자만 게시글을 삭제할 수 있습니다.';
  END IF;
  DELETE FROM public.community_posts WHERE id = p_post_id;
END; $$;
REVOKE ALL ON FUNCTION public.delete_community_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_community_post(uuid) TO authenticated;
