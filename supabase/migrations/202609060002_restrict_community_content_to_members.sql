-- 비회원은 커뮤니티 목록의 제목·작성자·게시판 정보만 확인할 수 있고,
-- 본문과 댓글은 로그인한 회원에게만 제공한다.
create or replace view public.community_posts_public as
select
  id,
  title,
  case when auth.uid() is null then ''::text else content end as content,
  board_category_id,
  author_nickname,
  created_at,
  updated_at,
  view_count,
  like_count,
  comment_count,
  is_pinned,
  post_number,
  author_id,
  is_public,
  link_url,
  board_post_number,
  thumbnail_url,
  thumbnail_crop
from public.community_posts
where is_public = true
   or author_id = auth.uid()
   or exists (select 1 from public.user_profiles profile where profile.id = auth.uid() and profile.is_admin = true);

create or replace view public.community_post_comments_public as
select
  comment.id,
  comment.post_id,
  comment.parent_comment_id,
  comment.author_id,
  comment.author_nickname,
  comment.content,
  comment.created_at,
  comment.updated_at
from public.community_post_comments comment
join public.community_posts post on post.id = comment.post_id
where auth.uid() is not null
  and (post.is_public or post.author_id = auth.uid() or public.community_is_admin());

grant select on public.community_posts_public to anon, authenticated;
grant select on public.community_post_comments_public to anon, authenticated;
notify pgrst, 'reload schema';
