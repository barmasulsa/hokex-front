-- 업체홍보게시판과 베뉴는 운영자가 검수해 등록하는 관리자 전용 게시판이다.
-- 화면 우회나 API 직접 호출도 막기 위해 게시글 생성·이동·수정 RPC에서 함께 검증한다.
create or replace function public.assert_community_admin_only_board_write(p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.community_board_categories
    where id = p_board_category_id
      and name in ('업체홍보게시판', '업체홍보 게시판', '베뉴')
  ) and not exists (
    select 1 from public.user_profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception '해당 게시판은 호켁스 관리자만 작성할 수 있습니다. 문의 메일: hokexpanda@gmail.com';
  end if;
end;
$$;

create or replace function public.create_community_post(
  p_title text, p_content text, p_link_url text, p_thumbnail_url text,
  p_thumbnail_crop jsonb, p_board_category_id text, p_is_public boolean
)
returns uuid language plpgsql security definer set search_path = public as $$
declare created_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if exists (select 1 from public.community_board_categories where id = p_board_category_id and name = '베스트 게시판') then raise exception '베스트 게시판에는 직접 글을 작성할 수 없습니다.'; end if;
  perform public.assert_community_admin_only_board_write(p_board_category_id);
  if not exists (select 1 from public.user_profiles where id = auth.uid() and nullif(trim(nickname), '') is not null) then raise exception '게시물 작성은 닉네임을 설정해야 가능합니다.'; end if;
  insert into public.community_posts (title, content, link_url, thumbnail_url, thumbnail_crop, board_category_id, author_id, is_public)
  values (trim(p_title), trim(p_content), nullif(trim(p_link_url), ''), nullif(trim(p_thumbnail_url), ''), p_thumbnail_crop, p_board_category_id, auth.uid(), coalesce(p_is_public, true))
  returning id into created_id;
  return created_id;
end; $$;

create or replace function public.update_community_post(
  p_post_id uuid, p_title text, p_content text, p_link_url text, p_thumbnail_url text,
  p_thumbnail_crop jsonb, p_board_category_id text, p_is_public boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and author_id = auth.uid()) then raise exception '작성자만 게시글을 수정할 수 있습니다.'; end if;
  perform public.assert_community_admin_only_board_write(p_board_category_id);
  update public.community_posts
  set title = trim(p_title), content = trim(p_content), link_url = nullif(trim(p_link_url), ''),
      thumbnail_url = nullif(trim(p_thumbnail_url), ''), thumbnail_crop = p_thumbnail_crop,
      board_category_id = p_board_category_id, is_public = coalesce(p_is_public, true)
  where id = p_post_id;
end; $$;

grant execute on function public.assert_community_admin_only_board_write(text) to authenticated;
grant execute on function public.create_community_post(text, text, text, text, jsonb, text, boolean) to authenticated;
grant execute on function public.update_community_post(uuid, text, text, text, text, jsonb, text, boolean) to authenticated;
notify pgrst, 'reload schema';
