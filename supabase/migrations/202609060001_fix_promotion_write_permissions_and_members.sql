-- 업체홍보게시판의 모든 하위 게시판은 관리자 또는 개별 글쓰기 권한 보유자만 작성할 수 있다.
-- 오래된 분류 데이터에는 parent_category_id가 없는 경우도 있어, 부모 다음의 연속된 활성
-- 게시판도 하위 게시판으로 인식한다.
create or replace function public.is_admin_only_community_write_board(p_board_category_id text)
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
  select exists (
    select 1 from ancestors
    where name in ('업체홍보게시판', '업체홍보 게시판', '베뉴')
  ) or exists (
    select 1
    from target
    join public.community_board_categories parent on true
    where target.is_active
      and parent.name in ('업체홍보게시판', '업체홍보 게시판')
      and target.display_order > parent.display_order
      and not exists (
        select 1
        from public.community_board_categories next_parent
        where next_parent.is_active = false
          and next_parent.display_order > parent.display_order
          and next_parent.display_order <= target.display_order
      )
  );
$$;

create or replace function public.assert_community_admin_only_board_write(p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_only_community_write_board(p_board_category_id)
     and not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
     and not exists (
       select 1 from public.community_board_write_permissions
       where user_id = auth.uid() and board_category_id = p_board_category_id
     ) then
    raise exception '해당 게시판은 호켁스 관리자 또는 글쓰기 권한을 부여받은 회원만 작성할 수 있습니다. 문의 메일: hokexpanda@gmail.com';
  end if;
end;
$$;

create or replace function public.get_admin_write_boards()
returns table (id text, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles profile where profile.id = auth.uid() and profile.is_admin = true) then
    raise exception '관리자만 조회할 수 있습니다.';
  end if;

  return query
  select category.id, category.name
  from public.community_board_categories category
  where category.is_active
    and public.is_admin_only_community_write_board(category.id)
  order by category.display_order;
end;
$$;

create or replace function public.grant_community_board_write_permission(p_user_id uuid, p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 권한을 부여할 수 있습니다.';
  end if;
  if not public.is_admin_only_community_write_board(p_board_category_id) then
    raise exception '관리자 전용 게시판에만 권한을 부여할 수 있습니다.';
  end if;

  insert into public.community_board_write_permissions (user_id, board_category_id, granted_by)
  values (p_user_id, p_board_category_id, auth.uid())
  on conflict do nothing;
end;
$$;

-- 회원 관리는 user_profiles가 아닌 인증 회원(auth.users)을 기준으로 표시한다.
-- 과거 카페인판다 이메일 회원처럼 프로필 이메일이 비어 있는 경우에도 인증 이메일을 보완한다.
create or replace function public.get_community_members()
returns table (
  id uuid,
  email text,
  nickname text,
  is_admin boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.user_profiles profile where profile.id = auth.uid() and profile.is_admin = true) then
    raise exception '관리자만 회원 목록을 조회할 수 있습니다.';
  end if;

  return query
  select auth_user.id,
         coalesce(nullif(trim(profile.email), ''), auth_user.email, '이메일 미설정') as email,
         profile.nickname,
         coalesce(profile.is_admin, false) as is_admin,
         auth_user.created_at
  from auth.users auth_user
  left join public.user_profiles profile on profile.id = auth_user.id
  order by auth_user.created_at desc;
end;
$$;

revoke all on function public.is_admin_only_community_write_board(text) from public;
grant execute on function public.is_admin_only_community_write_board(text) to authenticated;
revoke all on function public.assert_community_admin_only_board_write(text) from public;
grant execute on function public.assert_community_admin_only_board_write(text) to authenticated;
revoke all on function public.get_admin_write_boards() from public;
grant execute on function public.get_admin_write_boards() to authenticated;
revoke all on function public.grant_community_board_write_permission(uuid, text) from public;
grant execute on function public.grant_community_board_write_permission(uuid, text) to authenticated;
revoke all on function public.get_community_members() from public;
grant execute on function public.get_community_members() to authenticated;
notify pgrst, 'reload schema';
