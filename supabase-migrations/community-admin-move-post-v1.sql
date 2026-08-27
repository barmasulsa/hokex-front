-- A post can be moved only by an administrator; all post contents and interactions remain unchanged.
create or replace function public.move_community_post(p_post_id uuid, p_board_category_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if not exists (select 1 from public.community_board_categories where id = p_board_category_id and is_active and name <> '베스트 게시판') then raise exception '이동할 게시판을 찾을 수 없습니다.'; end if;
  update public.community_posts set board_category_id = p_board_category_id, updated_at = now() where id = p_post_id;
  if not found then raise exception '게시글을 찾을 수 없습니다.'; end if;
end; $$;
grant execute on function public.move_community_post(uuid, text) to authenticated;
