-- 회원의 이메일과 가입일은 관리자만 확인할 수 있도록 RPC로 한정한다.
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
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 회원 목록을 조회할 수 있습니다.';
  end if;

  return query
  select profile.id, profile.email, profile.nickname, profile.is_admin, profile.created_at
  from public.user_profiles profile
  order by profile.created_at desc;
end;
$$;

revoke all on function public.get_community_members() from public;
grant execute on function public.get_community_members() to authenticated;
notify pgrst, 'reload schema';
