-- Community board rules: durable article numbers and an automatic-only best board.
CREATE SEQUENCE IF NOT EXISTS public.community_post_number_seq AS bigint;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS post_number bigint;
ALTER TABLE public.community_posts ALTER COLUMN post_number SET DEFAULT nextval('public.community_post_number_seq');
UPDATE public.community_posts SET post_number = nextval('public.community_post_number_seq') WHERE post_number IS NULL;
ALTER TABLE public.community_posts ALTER COLUMN post_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_posts_post_number ON public.community_posts(post_number);
SELECT setval('public.community_post_number_seq', GREATEST(COALESCE((SELECT MAX(post_number) FROM public.community_posts), 0), 1), COALESCE((SELECT MAX(post_number) FROM public.community_posts), 0) > 0);

CREATE OR REPLACE FUNCTION public.set_community_post_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_nickname text; profile_email text; profile_admin boolean;
BEGIN
  -- 베스트 게시판은 다른 게시판의 반응이 높은 글을 자동 집계하는 전용 화면이다.
  IF EXISTS (SELECT 1 FROM public.community_board_categories WHERE id = NEW.board_category_id AND name = '베스트 게시판') THEN
    RAISE EXCEPTION '베스트 게시판에는 직접 글을 작성할 수 없습니다.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := auth.uid();
    SELECT nickname, email, is_admin INTO profile_nickname, profile_email, profile_admin FROM public.user_profiles WHERE id = auth.uid();
    NEW.author_nickname := COALESCE(profile_nickname, split_part(COALESCE(profile_email, '익명'), '@', 1));
    NEW.author_email := profile_email;
    NEW.is_pinned := COALESCE(profile_admin, false) AND COALESCE(NEW.is_pinned, false);
  ELSE
    NEW.author_id := OLD.author_id; NEW.author_nickname := OLD.author_nickname; NEW.author_email := OLD.author_email;
    NEW.post_number := OLD.post_number; NEW.is_pinned := OLD.is_pinned; NEW.updated_at := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE VIEW public.community_posts_public AS
SELECT id, title, content, board_category_id, author_nickname, created_at, updated_at, view_count, like_count, comment_count, is_pinned, post_number
FROM public.community_posts;
GRANT SELECT ON public.community_posts_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_community_post(p_title text, p_content text, p_board_category_id text)
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
  INSERT INTO public.community_posts (title, content, board_category_id, author_id)
  VALUES (trim(p_title), trim(p_content), p_board_category_id, auth.uid())
  RETURNING id INTO created_id;
  RETURN created_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_community_post(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_post(text, text, text) TO authenticated;
