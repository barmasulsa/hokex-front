-- HOKEX 회원가입 동의 이력: 필수 약관·개인정보처리방침과 선택 마케팅 동의를 분리해 기록한다.
create table if not exists public.user_consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  marketing_agreed boolean not null default false,
  age_over_14 boolean not null default false,
  agreed_at timestamptz not null default now(),
  unique (user_id, terms_version, privacy_version)
);
alter table public.user_consent_records enable row level security;

create or replace function public.capture_email_signup_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'hokex_terms_version'
     and new.raw_user_meta_data ? 'hokex_privacy_version' then
    insert into public.user_consent_records (user_id, terms_version, privacy_version, marketing_agreed, age_over_14)
    values (
      new.id,
      new.raw_user_meta_data->>'hokex_terms_version',
      new.raw_user_meta_data->>'hokex_privacy_version',
      coalesce((new.raw_user_meta_data->>'hokex_marketing_agreed')::boolean, false),
      coalesce((new.raw_user_meta_data->>'hokex_age_over_14')::boolean, false)
    )
    on conflict (user_id, terms_version, privacy_version)
    do update set marketing_agreed = excluded.marketing_agreed, age_over_14 = excluded.age_over_14, agreed_at = now();
  end if;
  return new;
end;
$$;
drop trigger if exists capture_email_signup_consent on auth.users;
create trigger capture_email_signup_consent
after insert on auth.users
for each row execute function public.capture_email_signup_consent();

create or replace function public.record_current_user_consent(
  p_terms_version text,
  p_privacy_version text,
  p_marketing_agreed boolean,
  p_age_over_14 boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if nullif(trim(p_terms_version), '') is null or nullif(trim(p_privacy_version), '') is null or not coalesce(p_age_over_14, false) then
    raise exception '필수 동의 내용을 확인해 주세요.';
  end if;
  insert into public.user_consent_records (user_id, terms_version, privacy_version, marketing_agreed, age_over_14)
  values (auth.uid(), trim(p_terms_version), trim(p_privacy_version), coalesce(p_marketing_agreed, false), true)
  on conflict (user_id, terms_version, privacy_version)
  do update set marketing_agreed = excluded.marketing_agreed, age_over_14 = true, agreed_at = now();
end;
$$;

create or replace function public.has_current_user_consent(p_terms_version text, p_privacy_version text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_consent_records
    where user_id = auth.uid() and terms_version = trim(p_terms_version) and privacy_version = trim(p_privacy_version) and age_over_14 = true
  );
$$;

revoke all on function public.record_current_user_consent(text, text, boolean, boolean) from public;
grant execute on function public.record_current_user_consent(text, text, boolean, boolean) to authenticated;
revoke all on function public.has_current_user_consent(text, text) from public;
grant execute on function public.has_current_user_consent(text, text) to authenticated;

-- 운영자가 광고주 등 특정 회원에게 관리자 전용 게시판의 글쓰기 권한을 개별 부여할 수 있다.
create table if not exists public.community_board_write_permissions (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  board_category_id text not null references public.community_board_categories(id) on delete cascade,
  granted_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, board_category_id)
);
alter table public.community_board_write_permissions enable row level security;

create or replace function public.assert_community_admin_only_board_write(p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.community_board_categories
    where id = p_board_category_id and name in ('업체홍보게시판', '업체홍보 게시판', '베뉴')
  ) and not exists (
    select 1 from public.user_profiles where id = auth.uid() and is_admin = true
  ) and not exists (
    select 1 from public.community_board_write_permissions
    where user_id = auth.uid() and board_category_id = p_board_category_id
  ) then
    raise exception '해당 게시판은 호켁스 관리자 또는 글쓰기 권한을 부여받은 회원만 작성할 수 있습니다. 문의 메일: hokexpanda@gmail.com';
  end if;
end;
$$;

create or replace function public.get_my_community_write_permission_board_ids()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(board_category_id order by board_category_id), '{}'::text[])
  from public.community_board_write_permissions where user_id = auth.uid();
$$;

create or replace function public.get_admin_write_boards()
returns table (id text, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then raise exception '관리자만 조회할 수 있습니다.'; end if;
  return query select category.id, category.name from public.community_board_categories category where category.name in ('업체홍보게시판', '업체홍보 게시판', '베뉴') order by category.display_order;
end;
$$;

create or replace function public.get_community_write_permissions()
returns table (user_id uuid, board_category_id text, board_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then raise exception '관리자만 조회할 수 있습니다.'; end if;
  return query select permission.user_id, permission.board_category_id, category.name from public.community_board_write_permissions permission join public.community_board_categories category on category.id = permission.board_category_id order by category.display_order;
end;
$$;

create or replace function public.grant_community_board_write_permission(p_user_id uuid, p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then raise exception '관리자만 권한을 부여할 수 있습니다.'; end if;
  if not exists (select 1 from public.community_board_categories where id = p_board_category_id and name in ('업체홍보게시판', '업체홍보 게시판', '베뉴')) then raise exception '관리자 전용 게시판에만 권한을 부여할 수 있습니다.'; end if;
  insert into public.community_board_write_permissions (user_id, board_category_id, granted_by) values (p_user_id, p_board_category_id, auth.uid()) on conflict do nothing;
end;
$$;

create or replace function public.revoke_community_board_write_permission(p_user_id uuid, p_board_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true) then raise exception '관리자만 권한을 회수할 수 있습니다.'; end if;
  delete from public.community_board_write_permissions where user_id = p_user_id and board_category_id = p_board_category_id;
end;
$$;

revoke all on function public.get_my_community_write_permission_board_ids() from public;
grant execute on function public.get_my_community_write_permission_board_ids() to authenticated;
revoke all on function public.get_admin_write_boards() from public;
grant execute on function public.get_admin_write_boards() to authenticated;
revoke all on function public.get_community_write_permissions() from public;
grant execute on function public.get_community_write_permissions() to authenticated;
revoke all on function public.grant_community_board_write_permission(uuid, text) from public;
grant execute on function public.grant_community_board_write_permission(uuid, text) to authenticated;
revoke all on function public.revoke_community_board_write_permission(uuid, text) from public;
grant execute on function public.revoke_community_board_write_permission(uuid, text) to authenticated;
notify pgrst, 'reload schema';
