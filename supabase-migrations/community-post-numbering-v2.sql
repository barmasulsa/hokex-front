-- Two complementary post numbers:
--   post_number       = HOKEX community-wide chronological number (used in 전체 글)
--   board_post_number = chronological number inside each individual board
alter table public.community_posts add column if not exists board_post_number bigint;

with board_ranked as (
  select id, row_number() over (partition by board_category_id order by created_at, id) as number
  from public.community_posts
)
update public.community_posts post set board_post_number = ranked.number from board_ranked ranked where post.id = ranked.id;

with community_ranked as (
  select id, row_number() over (order by created_at, id) as number
  from public.community_posts
)
update public.community_posts post set post_number = ranked.number from community_ranked ranked where post.id = ranked.id;

alter table public.community_posts alter column board_post_number set not null;
create unique index if not exists idx_community_posts_board_post_number on public.community_posts(board_category_id, board_post_number);
select setval('public.community_post_number_seq', coalesce(max(post_number), 1), count(*) > 0) from public.community_posts;

create or replace function public.assign_community_board_post_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- 같은 게시판으로 동시에 등록되어도 번호가 겹치지 않도록 게시판 단위 잠금을 사용한다.
    perform pg_advisory_xact_lock(hashtext(new.board_category_id));
    select coalesce(max(board_post_number), 0) + 1 into new.board_post_number
    from public.community_posts where board_category_id = new.board_category_id and id is distinct from new.id;
  elsif new.board_category_id is distinct from old.board_category_id then
    perform pg_advisory_xact_lock(hashtext(new.board_category_id));
    select coalesce(max(board_post_number), 0) + 1 into new.board_post_number
    from public.community_posts where board_category_id = new.board_category_id and id is distinct from new.id;
  else
    new.board_post_number := old.board_post_number;
  end if;
  return new;
end; $$;
drop trigger if exists assign_community_board_post_number_trigger on public.community_posts;
create trigger assign_community_board_post_number_trigger
before insert or update of board_category_id on public.community_posts
for each row execute function public.assign_community_board_post_number();

-- 일반 수정에서는 전체글 번호를 보호하되, 삭제 후 재정렬 작업만 번호 변경을 허용한다.
create or replace function public.set_community_post_author()
returns trigger language plpgsql security definer set search_path = public as $$
declare profile_nickname text; profile_email text; profile_admin boolean;
begin
  if exists (select 1 from public.community_board_categories where id = new.board_category_id and name = '베스트 게시판') then
    raise exception '베스트 게시판에는 직접 글을 작성할 수 없습니다.';
  end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    select nickname, email, is_admin into profile_nickname, profile_email, profile_admin from public.user_profiles where id = auth.uid();
    new.author_nickname := coalesce(profile_nickname, split_part(coalesce(profile_email, '익명'), '@', 1));
    new.author_email := profile_email;
    new.is_pinned := coalesce(profile_admin, false) and coalesce(new.is_pinned, false);
  else
    new.author_id := old.author_id; new.author_nickname := old.author_nickname; new.author_email := old.author_email;
    if current_setting('app.community_renumbering', true) is distinct from 'on' then new.post_number := old.post_number; end if;
    new.is_pinned := old.is_pinned; new.updated_at := now();
  end if;
  return new;
end; $$;

create or replace function public.resequence_community_post_numbers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.community_renumbering', 'on', true);
  with community_ranked as (
    select id, row_number() over (order by created_at, id) as number from public.community_posts
  )
  update public.community_posts post set post_number = ranked.number from community_ranked ranked where post.id = ranked.id and post.post_number is distinct from ranked.number;
  with board_ranked as (
    select id, row_number() over (partition by board_category_id order by created_at, id) as number from public.community_posts
  )
  update public.community_posts post set board_post_number = ranked.number from board_ranked ranked where post.id = ranked.id and post.board_post_number is distinct from ranked.number;
  perform setval('public.community_post_number_seq', coalesce((select max(post_number) from public.community_posts), 1), (select count(*) > 0 from public.community_posts));
  return old;
end; $$;
drop trigger if exists resequence_community_post_numbers_trigger on public.community_posts;
create trigger resequence_community_post_numbers_trigger
after delete on public.community_posts
for each row execute function public.resequence_community_post_numbers();

create or replace view public.community_posts_public as
select id, title, content, board_category_id, author_nickname, created_at, updated_at,
       view_count, like_count, comment_count, is_pinned, post_number, author_id, is_public, link_url, board_post_number
from public.community_posts
where is_public = true
   or author_id = auth.uid()
   or exists (select 1 from public.user_profiles profile where profile.id = auth.uid() and profile.is_admin = true);
grant select on public.community_posts_public to anon, authenticated;
