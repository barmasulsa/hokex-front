-- One-level replies to a comment.
alter table public.community_post_comments add column if not exists parent_comment_id uuid references public.community_post_comments(id) on delete cascade;
alter table public.community_post_comments drop constraint if exists community_comment_not_own_parent;
alter table public.community_post_comments add constraint community_comment_not_own_parent check (parent_comment_id is null or parent_comment_id <> id);

drop view if exists public.community_post_comments_public;
create view public.community_post_comments_public as
select c.id, c.post_id, c.parent_comment_id, c.author_id, c.author_nickname, c.content, c.created_at, c.updated_at
from public.community_post_comments c join public.community_posts p on p.id = c.post_id
where p.is_public or p.author_id = auth.uid() or public.community_is_admin();

create or replace function public.create_community_comment(p_post_id uuid, p_content text, p_parent_comment_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nickname text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select nickname into v_nickname from public.user_profiles where id = auth.uid();
  if coalesce(btrim(v_nickname), '') = '' then raise exception '닉네임 설정이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and (is_public or author_id = auth.uid() or public.community_is_admin())) then raise exception '게시글을 찾을 수 없습니다.'; end if;
  if p_parent_comment_id is not null and not exists (select 1 from public.community_post_comments where id = p_parent_comment_id and post_id = p_post_id and parent_comment_id is null) then raise exception '답글 대상 댓글을 찾을 수 없습니다.'; end if;
  insert into public.community_post_comments(post_id, parent_comment_id, author_id, author_nickname, content) values (p_post_id, p_parent_comment_id, auth.uid(), v_nickname, btrim(p_content)) returning id into v_id;
  return v_id;
end; $$;

grant select on public.community_post_comments_public to anon, authenticated;
grant execute on function public.create_community_comment(uuid, text, uuid) to authenticated;
