-- 홍보게시판의 하위 게시글만 관리자가 상단 광고로 고정할 수 있다.
-- parent_category_id가 비어 있는 기존 분류 데이터도 지원한다.
create or replace function public.is_promotion_gallery_community_board(p_board_category_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors as (
    select id, name, parent_category_id, display_order, is_active
    from public.community_board_categories
    where id = p_board_category_id
    union all
    select parent.id, parent.name, parent.parent_category_id, parent.display_order, parent.is_active
    from public.community_board_categories parent
    join ancestors child on child.parent_category_id = parent.id
  ), target as (
    select id, display_order, is_active
    from public.community_board_categories
    where id = p_board_category_id
  )
  select exists (select 1 from ancestors where name = '홍보게시판')
    or exists (
      select 1 from target
      join public.community_board_categories parent on true
      where target.is_active and parent.name = '홍보게시판' and target.display_order > parent.display_order
        and not exists (
          select 1 from public.community_board_categories next_parent
          where next_parent.is_active = false and next_parent.display_order > parent.display_order and next_parent.display_order <= target.display_order
        )
    );
$$;

create or replace function public.set_community_post_pinned(p_post_id uuid, p_is_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_board_id text;
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 상단 광고를 설정할 수 있습니다.';
  end if;
  select board_category_id into target_board_id from public.community_posts where id = p_post_id;
  if target_board_id is null then raise exception '게시글을 찾을 수 없습니다.'; end if;
  if not public.is_promotion_gallery_community_board(target_board_id) then
    raise exception '홍보게시판의 하위 게시글만 상단 광고로 고정할 수 있습니다.';
  end if;
  update public.community_posts set is_pinned = coalesce(p_is_pinned, false) where id = p_post_id;
end;
$$;

revoke all on function public.is_promotion_gallery_community_board(text) from public;
grant execute on function public.is_promotion_gallery_community_board(text) to authenticated;
revoke all on function public.set_community_post_pinned(uuid, boolean) from public;
grant execute on function public.set_community_post_pinned(uuid, boolean) to authenticated;
notify pgrst, 'reload schema';
