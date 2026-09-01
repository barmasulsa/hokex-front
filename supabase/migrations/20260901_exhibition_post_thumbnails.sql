-- Optional poster image for gallery-style exhibition posts.
alter table public.community_posts
  add column if not exists thumbnail_url text;

alter table public.community_posts
  drop constraint if exists community_posts_thumbnail_url_check;
alter table public.community_posts
  add constraint community_posts_thumbnail_url_check
  check (thumbnail_url is null or thumbnail_url ~* '^https?://');

create or replace view public.community_posts_public as
select id, title, content, board_category_id, author_nickname, created_at, updated_at,
       view_count, like_count, comment_count, is_pinned, post_number, author_id,
       is_public, link_url, board_post_number, thumbnail_url
from public.community_posts
where is_public = true
   or author_id = auth.uid()
   or exists (
     select 1 from public.user_profiles profile
     where profile.id = auth.uid() and profile.is_admin = true
   );
grant select on public.community_posts_public to anon, authenticated;

drop function if exists public.create_community_post(text, text, text, text, boolean);
create function public.create_community_post(
  p_title text,
  p_content text,
  p_link_url text,
  p_thumbnail_url text,
  p_board_category_id text,
  p_is_public boolean
)
returns uuid language plpgsql security definer set search_path = public as $$
declare created_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if exists (select 1 from public.community_board_categories where id = p_board_category_id and name = '베스트 게시판') then
    raise exception '베스트 게시판에는 직접 글을 작성할 수 없습니다.';
  end if;
  if not exists (select 1 from public.user_profiles where id = auth.uid() and nullif(trim(nickname), '') is not null) then
    raise exception '게시물 작성은 닉네임을 설정해야 가능합니다.';
  end if;
  insert into public.community_posts (title, content, link_url, thumbnail_url, board_category_id, author_id, is_public)
  values (trim(p_title), trim(p_content), nullif(trim(p_link_url), ''), nullif(trim(p_thumbnail_url), ''), p_board_category_id, auth.uid(), coalesce(p_is_public, true))
  returning id into created_id;
  return created_id;
end; $$;
revoke all on function public.create_community_post(text, text, text, text, text, boolean) from public;
grant execute on function public.create_community_post(text, text, text, text, text, boolean) to authenticated;

drop function if exists public.update_community_post(uuid, text, text, text, text, boolean);
create function public.update_community_post(
  p_post_id uuid,
  p_title text,
  p_content text,
  p_link_url text,
  p_thumbnail_url text,
  p_board_category_id text,
  p_is_public boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and author_id = auth.uid()) then
    raise exception '작성자만 게시글을 수정할 수 있습니다.';
  end if;
  update public.community_posts
  set title = trim(p_title),
      content = trim(p_content),
      link_url = nullif(trim(p_link_url), ''),
      thumbnail_url = nullif(trim(p_thumbnail_url), ''),
      board_category_id = p_board_category_id,
      is_public = coalesce(p_is_public, true)
  where id = p_post_id;
end; $$;
revoke all on function public.update_community_post(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.update_community_post(uuid, text, text, text, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
