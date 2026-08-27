-- Community post visibility: public by default; private posts are visible only to their author and administrators.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
UPDATE public.community_posts SET is_public = true WHERE is_public IS NULL;

CREATE OR REPLACE VIEW public.community_posts_public AS
SELECT id, title, content, board_category_id, author_nickname, created_at, updated_at, view_count, like_count, comment_count, is_pinned, post_number, author_id, is_public
FROM public.community_posts
WHERE is_public = true
   OR author_id = auth.uid()
   OR EXISTS (SELECT 1 FROM public.user_profiles profile WHERE profile.id = auth.uid() AND profile.is_admin = true);
GRANT SELECT ON public.community_posts_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_community_post(p_title text, p_content text, p_board_category_id text, p_is_public boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_board_categories WHERE id = p_board_category_id AND name = '베스트 게시판') THEN
    RAISE EXCEPTION '베스트 게시판에는 직접 글을 작성할 수 없습니다.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND nullif(trim(nickname), '') IS NOT NULL) THEN
    RAISE EXCEPTION '게시물 작성은 닉네임을 설정해야 가능합니다.';
  END IF;
  INSERT INTO public.community_posts (title, content, board_category_id, author_id, is_public)
  VALUES (trim(p_title), trim(p_content), p_board_category_id, auth.uid(), COALESCE(p_is_public, true))
  RETURNING id INTO created_id;
  RETURN created_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_community_post(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_post(text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_community_post(p_post_id uuid, p_title text, p_content text, p_board_category_id text, p_is_public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id AND author_id = auth.uid()) THEN
    RAISE EXCEPTION '작성자만 게시글을 수정할 수 있습니다.';
  END IF;
  UPDATE public.community_posts
  SET title = trim(p_title), content = trim(p_content), board_category_id = p_board_category_id, is_public = COALESCE(p_is_public, true)
  WHERE id = p_post_id;
END; $$;
REVOKE ALL ON FUNCTION public.update_community_post(uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_community_post(uuid, text, text, text, boolean) TO authenticated;
