-- Add report handling for comments and show both post/comment reports to administrators.
create table if not exists public.community_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_post_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('게시판의 성격과 맞는 게시글이 아닙니다.', '혐오/차별적/생명경시/욕설 표현입니다.', '스팸홍보/도배입니다.', '불법정보를 포함하고 있습니다.', '음란물입니다.', '불쾌한 표현이 있습니다.')),
  details text check (char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references auth.users(id)
);
create unique index if not exists community_comment_reports_one_pending_per_user on public.community_comment_reports(comment_id, reporter_id) where status = 'pending';
alter table public.community_comment_reports enable row level security;

create or replace function public.create_community_comment_report(p_comment_id uuid, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.community_post_comments c join public.community_posts p on p.id = c.post_id where c.id = p_comment_id and (p.is_public or p.author_id = auth.uid() or public.community_is_admin())) then raise exception '댓글을 찾을 수 없습니다.'; end if;
  insert into public.community_comment_reports(comment_id, reporter_id, reason, details) values (p_comment_id, auth.uid(), p_reason, nullif(btrim(p_details), '')) returning id into v_id;
  return v_id;
end; $$;

drop function if exists public.get_community_reports();
create function public.get_community_reports()
returns table(id uuid, target_type text, post_id uuid, comment_id uuid, post_number integer, post_title text, target_content text, reporter_nickname text, reason text, details text, status text, created_at timestamptz, resolved_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  return query
  select r.id, 'post'::text, r.post_id, null::uuid, p.post_number, p.title, null::text, u.nickname, r.reason, r.details, r.status, r.created_at, r.resolved_at from public.community_post_reports r join public.community_posts p on p.id = r.post_id left join public.user_profiles u on u.id = r.reporter_id
  union all
  select r.id, 'comment'::text, c.post_id, r.comment_id, p.post_number, p.title, c.content, u.nickname, r.reason, r.details, r.status, r.created_at, r.resolved_at from public.community_comment_reports r join public.community_post_comments c on c.id = r.comment_id join public.community_posts p on p.id = c.post_id left join public.user_profiles u on u.id = r.reporter_id
  order by 12 desc;
end; $$;

create or replace function public.resolve_community_report(p_report_id uuid, p_target_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if p_target_type = 'comment' then update public.community_comment_reports set status = 'resolved', resolved_at = now(), resolved_by = auth.uid() where id = p_report_id;
  else update public.community_post_reports set status = 'resolved', resolved_at = now(), resolved_by = auth.uid() where id = p_report_id; end if;
  if not found then raise exception '신고를 찾을 수 없습니다.'; end if;
end; $$;

grant execute on function public.create_community_comment_report(uuid, text, text), public.get_community_reports(), public.resolve_community_report(uuid, text) to authenticated;
