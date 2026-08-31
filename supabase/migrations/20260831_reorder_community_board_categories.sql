-- 관리자용: 특정 하위 게시판 묶음의 현재 자리(display_order)를 서로 교환한다.
-- 전체 게시판의 다른 항목 순서는 바꾸지 않는다.
create or replace function public.reorder_community_board_categories(p_category_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_slots integer[];
  v_offset integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception '관리자만 게시판 순서를 변경할 수 있습니다.';
  end if;

  if coalesce(array_length(p_category_ids, 1), 0) < 2 then
    return;
  end if;

  select count(*) into v_count
  from public.community_board_categories
  where id = any(p_category_ids);

  if v_count <> array_length(p_category_ids, 1) then
    raise exception '존재하지 않는 게시판이 포함되어 있습니다.';
  end if;

  select array_agg(display_order order by display_order), coalesce(max(abs(display_order)), 0) + 1000
  into v_slots, v_offset
  from public.community_board_categories
  where id = any(p_category_ids);

  -- display_order에 고유 제약이 있어도 충돌하지 않도록 먼저 임시 음수값으로 이동한다.
  update public.community_board_categories
  set display_order = -v_offset - display_order
  where id = any(p_category_ids);

  with requested as (
    select category_id, ordinality as requested_position
    from unnest(p_category_ids) with ordinality as item(category_id, ordinality)
  )
  update public.community_board_categories category
  set display_order = v_slots[requested.requested_position]
  from requested
  where category.id = requested.category_id;
end;
$$;

grant execute on function public.reorder_community_board_categories(uuid[]) to authenticated;
