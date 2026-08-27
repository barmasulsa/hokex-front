-- Community interactions: likes, comments, reports and administrator review.
create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_nickname text not null,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('게시판의 성격과 맞는 게시글이 아닙니다.', '혐오/차별적/생명경시/욕설 표현입니다.', '스팸홍보/도배입니다.', '불법정보를 포함하고 있습니다.', '음란물입니다.', '불쾌한 표현이 있습니다.')),
  details text check (char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
create unique index if not exists community_post_reports_one_pending_per_user on public.community_post_reports(post_id, reporter_id) where status = 'pending';

alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_post_reports enable row level security;

create or replace function public.community_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.user_profiles where id = auth.uid()), false)
$$;

create or replace function public.sync_community_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_posts set like_count = (select count(*) from public.community_post_likes where post_id = coalesce(new.post_id, old.post_id)) where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end; $$;
drop trigger if exists community_like_count_trigger on public.community_post_likes;
create trigger community_like_count_trigger after insert or delete on public.community_post_likes for each row execute function public.sync_community_like_count();

create or replace function public.sync_community_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_posts set comment_count = (select count(*) from public.community_post_comments where post_id = coalesce(new.post_id, old.post_id)) where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end; $$;
drop trigger if exists community_comment_count_trigger on public.community_post_comments;
create trigger community_comment_count_trigger after insert or delete on public.community_post_comments for each row execute function public.sync_community_comment_count();

create or replace view public.community_post_comments_public with (security_invoker = true) as
select c.id, c.post_id, c.author_id, c.author_nickname, c.content, c.created_at, c.updated_at
from public.community_post_comments c
join public.community_posts p on p.id = c.post_id
where p.is_public or p.author_id = auth.uid() or public.community_is_admin();

create or replace function public.get_community_post_like_status(p_post_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('liked', exists(select 1 from public.community_post_likes where post_id = p_post_id and user_id = auth.uid()), 'like_count', coalesce((select like_count from public.community_posts where id = p_post_id), 0))
$$;

create or replace function public.toggle_community_post_like(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_liked boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and (is_public or author_id = auth.uid() or public.community_is_admin())) then raise exception '게시글을 찾을 수 없습니다.'; end if;
  if exists (select 1 from public.community_post_likes where post_id = p_post_id and user_id = auth.uid()) then
    delete from public.community_post_likes where post_id = p_post_id and user_id = auth.uid(); v_liked := false;
  else
    insert into public.community_post_likes(post_id, user_id) values (p_post_id, auth.uid()); v_liked := true;
  end if;
  return jsonb_build_object('liked', v_liked, 'like_count', (select like_count from public.community_posts where id = p_post_id));
end; $$;

create or replace function public.create_community_comment(p_post_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nickname text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select nickname into v_nickname from public.user_profiles where id = auth.uid();
  if coalesce(btrim(v_nickname), '') = '' then raise exception '닉네임 설정이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and (is_public or author_id = auth.uid() or public.community_is_admin())) then raise exception '게시글을 찾을 수 없습니다.'; end if;
  insert into public.community_post_comments(post_id, author_id, author_nickname, content) values (p_post_id, auth.uid(), v_nickname, btrim(p_content)) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.delete_community_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  delete from public.community_post_comments where id = p_comment_id and (author_id = auth.uid() or public.community_is_admin());
  if not found then raise exception '삭제 권한이 없습니다.'; end if;
end; $$;

create or replace function public.create_community_post_report(p_post_id uuid, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and (is_public or author_id = auth.uid() or public.community_is_admin())) then raise exception '게시글을 찾을 수 없습니다.'; end if;
  insert into public.community_post_reports(post_id, reporter_id, reason, details) values (p_post_id, auth.uid(), p_reason, nullif(btrim(p_details), '')) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.get_community_reports()
returns table(id uuid, post_id uuid, post_number integer, post_title text, reporter_nickname text, reason text, details text, status text, created_at timestamptz, resolved_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  return query select r.id, r.post_id, p.post_number, p.title, u.nickname, r.reason, r.details, r.status, r.created_at, r.resolved_at from public.community_post_reports r join public.community_posts p on p.id = r.post_id left join public.user_profiles u on u.id = r.reporter_id order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc;
end; $$;

create or replace function public.resolve_community_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  update public.community_post_reports set status = 'resolved', resolved_at = now(), resolved_by = auth.uid() where id = p_report_id;
  if not found then raise exception '신고를 찾을 수 없습니다.'; end if;
end; $$;

grant select on public.community_post_comments_public to anon, authenticated;
grant execute on function public.get_community_post_like_status(uuid), public.toggle_community_post_like(uuid), public.create_community_comment(uuid, text), public.delete_community_comment(uuid), public.create_community_post_report(uuid, text, text), public.get_community_reports(), public.resolve_community_report(uuid) to authenticated;
