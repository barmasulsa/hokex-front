-- HOKEX community core: secure author ownership, public-safe read view, and view counter.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts(author_id);

CREATE OR REPLACE FUNCTION public.set_community_post_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_nickname text; profile_email text; profile_admin boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := auth.uid();
    SELECT nickname, email, is_admin INTO profile_nickname, profile_email, profile_admin FROM public.user_profiles WHERE id = auth.uid();
    NEW.author_nickname := COALESCE(profile_nickname, split_part(COALESCE(profile_email, '익명'), '@', 1));
    NEW.author_email := profile_email;
    NEW.is_pinned := COALESCE(profile_admin, false) AND COALESCE(NEW.is_pinned, false);
  ELSE
    NEW.author_id := OLD.author_id; NEW.author_nickname := OLD.author_nickname; NEW.author_email := OLD.author_email;
    NEW.is_pinned := OLD.is_pinned; NEW.updated_at := now();
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS set_community_post_author_trigger ON public.community_posts;
CREATE TRIGGER set_community_post_author_trigger BEFORE INSERT OR UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.set_community_post_author();

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_posts_select_all ON public.community_posts;
DROP POLICY IF EXISTS community_posts_insert_authenticated ON public.community_posts;
DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_insert_authenticated ON public.community_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY community_posts_update_own ON public.community_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY community_posts_delete_own ON public.community_posts FOR DELETE TO authenticated USING (author_id = auth.uid());

REVOKE ALL ON public.community_posts FROM anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
CREATE OR REPLACE VIEW public.community_posts_public AS SELECT id, title, content, board_category_id, author_nickname, created_at, updated_at, view_count, like_count, comment_count, is_pinned FROM public.community_posts;
GRANT SELECT ON public.community_posts_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_community_post(p_title text, p_content text, p_board_category_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
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

CREATE OR REPLACE FUNCTION public.increment_community_post_view(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN UPDATE public.community_posts SET view_count = view_count + 1 WHERE id = post_id; END; $$;
REVOKE ALL ON FUNCTION public.increment_community_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO anon, authenticated;

-- Community image attachments. Files are public only after a signed-in member uploads them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-images', 'community-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS community_images_insert_own ON storage.objects;
DROP POLICY IF EXISTS community_images_delete_own ON storage.objects;
CREATE POLICY community_images_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-images' AND owner_id = (auth.uid())::text);
CREATE POLICY community_images_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community-images' AND owner_id = (auth.uid())::text);

-- General file attachments use a separate public bucket and retain the same owner-only write rule.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('community-files', 'community-files', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;
DROP POLICY IF EXISTS community_files_insert_own ON storage.objects;
DROP POLICY IF EXISTS community_files_delete_own ON storage.objects;
CREATE POLICY community_files_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-files' AND owner_id = (auth.uid())::text);
CREATE POLICY community_files_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community-files' AND owner_id = (auth.uid())::text);
