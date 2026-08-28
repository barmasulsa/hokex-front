-- Allow replies to any existing comment in the same post, and let authors edit their own comment.
create or replace function public.create_community_comment(p_post_id uuid, p_content text, p_parent_comment_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nickname text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select nickname into v_nickname from public.user_profiles where id = auth.uid();
  if coalesce(btrim(v_nickname), '') = '' then raise exception '닉네임 설정이 필요합니다.'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception '내용을 입력해 주세요.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and (is_public or author_id = auth.uid() or public.community_is_admin())) then raise exception '게시글을 찾을 수 없습니다.'; end if;
  if p_parent_comment_id is not null and not exists (select 1 from public.community_post_comments where id = p_parent_comment_id and post_id = p_post_id) then raise exception '답글 대상 댓글을 찾을 수 없습니다.'; end if;
  insert into public.community_post_comments(post_id, parent_comment_id, author_id, author_nickname, content)
  values (p_post_id, p_parent_comment_id, auth.uid(), v_nickname, btrim(p_content)) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_community_comment(p_comment_id uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception '내용을 입력해 주세요.'; end if;
  update public.community_post_comments set content = btrim(p_content), updated_at = now()
  where id = p_comment_id and author_id = auth.uid();
  if not found then raise exception '작성자만 수정할 수 있습니다.'; end if;
end; $$;

grant execute on function public.create_community_comment(uuid, text, uuid), public.update_community_comment(uuid, text) to authenticated;
