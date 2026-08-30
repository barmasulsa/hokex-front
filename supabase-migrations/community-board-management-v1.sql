-- Community board administration: hierarchy, descriptions, and administrator-only editing.
alter table public.community_board_categories add column if not exists parent_category_id text references public.community_board_categories(id) on delete restrict;

-- Attach existing boards to their visible section headers once. Existing post category IDs remain unchanged.
update public.community_board_categories set parent_category_id = case
  when id in ('mice-association', 'mice-in', 'akei', 'tpaf') then 'related-org-section'
  when id in ('job-fulltime', 'job-parttime', 'job-volunteer') then 'job-section'
  when id in ('promotion-exhibition', 'promotion-forum', 'promotion-education', 'promotion-performance', 'promotion-event', 'promotion-venue') then 'promotion-section'
  when id in ('vendor-design', 'vendor-booth', 'vendor-etc') then 'vendor-section'
  else parent_category_id
end;

-- Official labels and non-duplicated icons.
update public.community_board_categories
set name = case when id = 'mice-in' then 'MICE人(마이스인)' else name end,
    icon = case when id = 'promotion-venue' then '🏟️' when id = 'promotion-exhibition' then '🛖' else icon end;

with descriptions(id, description) as (values
  ('free', '판다 여러분들의 일상에서의 자유로운 글들을 남겨주세요.' || E'\n' || '※ 정치/광고/홍보/분란 등의 글 엄히 금지'),
  ('question', 'MICE 산업과 연관 및 연계될 수 있는 산업, 직종, 전망, 정보 등등의 질문 게시판입니다.'),
  ('news', 'MICE 산업과 연관 및 연계될 수 있는 언론사의 뉴스 게시판입니다.' || E'\n' || '제목 양식은, 기사 제목 <언론사명>으로(예시: 호켁스 탄생하다! <호켁스>) 저작권 문제로 게시글 클릭 시 URL 연동으로 되어있습니다.'),
  ('info', 'MICE 산업과 연관 및 연계될 수 있는 유용한 정보(소식) 게시판이며 근거 및 출처가 있어야 합니다.'),
  ('contest', 'MICE 산업과 연관 및 연계될 수 있는 공모전 게시판입니다.'),
  ('survey', 'MICE와 연관 및 연계될 수 있는 논문/설문 게시판입니다.'),
  ('mice-association', 'MICE 협회의 소식 및 정보를 전해주는 게시판입니다.'),
  ('mice-in', '마이스인의 소식 및 정보를 전해주는 게시판입니다.'),
  ('akei', 'AKEI 한국전시산업진흥회의 소식 및 정보를 전해주는 게시판입니다.'),
  ('tpaf', '전통공연예술진흥재단의 소식 및 정보를 전해주는 게시판입니다.'),
  ('job-fulltime', 'MICE 산업과 연관 및 연계될 수 있는 직종의 장기 인력 모집 게시판입니다.'),
  ('job-parttime', 'MICE 산업과 연관 및 연계될 수 있는 단발성 전시, 행사, 활동 등의 인력을 모집하는 게시판입니다.'),
  ('job-volunteer', 'MICE 산업과 연관 및 연계될 수 있는 전시, 행사, 활동 등이면서' || E'\n' || '법정 최저임금 미만의 급여를 지급하거나 비대가성의 인력을 모집하는 게시판입니다.'),
  ('promotion-exhibition', '호켁스에서 “전시”란 주최자가 존재하고 행사가 여러 개의 부스(구조물, 시설 등)로 구성되며 그 부스가 전시의 메인이 되고,' || E'\n' || '독립된 부스와 그 부스마다 부스를 운영하는 독립된 업체 등이 있으며,' || E'\n' || '참가 티켓이나 참가 신청서 등으로 출입을 통제하는 전시를 의미합니다.'),
  ('promotion-forum', '포럼 홍보 게시판입니다.'),
  ('promotion-education', 'MICE 산업과 연관 및 연계가 될 수 있거나 업무, 일상 등에 유용한 강의&교육 홍보 게시판입니다.'),
  ('promotion-performance', '공연(오페라, 연주회, 뮤지컬 등등) 홍보 게시판입니다.'),
  ('promotion-event', '전시와 포럼에 해당되지 않는 행사/이벤트/팝업 홍보 게시판입니다.'),
  ('promotion-venue', '전시, 포럼, 행사, 이벤트, 팝업, 강의, 결혼식 등을 실행할 수 있는 장소를 홍보하는 게시판입니다.'),
  ('vendor-design', '디자인&인쇄&제본 업체 홍보 게시판입니다.'),
  ('vendor-booth', '부스 설비 제작, 부스 운송 등 부스와 관련된 업체 홍보 게시판입니다.'),
  ('vendor-etc', 'MICE 산업과 연관된 업체 홍보 게시판입니다.')
)
update public.community_board_categories c set description = d.description from descriptions d where c.id = d.id;

create or replace function public.upsert_community_board_category(
  p_id text, p_name text, p_description text, p_icon text,
  p_parent_category_id text default null, p_is_active boolean default true
) returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_order integer;
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if nullif(btrim(p_name), '') is null then raise exception '게시판 이름을 입력해 주세요.'; end if;
  if p_parent_category_id is not null and not exists (select 1 from public.community_board_categories where id = p_parent_category_id and not is_active) then
    raise exception '상위 게시판을 찾을 수 없습니다.';
  end if;
  if p_id is null then
    if p_parent_category_id is null then
      select coalesce(max(display_order), 0) + 1 into v_order from public.community_board_categories;
    else
      select coalesce(max(display_order), 0) + 1 into v_order
      from public.community_board_categories where id = p_parent_category_id or parent_category_id = p_parent_category_id;
      update public.community_board_categories set display_order = display_order + 1 where display_order >= v_order;
    end if;
    v_id := 'community-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
    insert into public.community_board_categories(id, name, description, icon, is_active, display_order, parent_category_id)
    values (v_id, btrim(p_name), btrim(coalesce(p_description, '')), coalesce(nullif(btrim(p_icon), ''), '📌'), p_is_active, v_order, p_parent_category_id);
  else
    v_id := p_id;
    update public.community_board_categories set name = btrim(p_name), description = btrim(coalesce(p_description, '')), icon = coalesce(nullif(btrim(p_icon), ''), '📌'), parent_category_id = p_parent_category_id, is_active = p_is_active where id = p_id;
    if not found then raise exception '게시판을 찾을 수 없습니다.'; end if;
  end if;
  return v_id;
end; $$;
grant execute on function public.upsert_community_board_category(text, text, text, text, text, boolean) to authenticated;

-- 삭제 전 게시판 설정을 자동 보관한다. 게시글은 삭제하지 않으며, 삭제 당시 연결 수만 함께 기록한다.
create table if not exists public.community_board_category_backups (
  id uuid primary key default gen_random_uuid(),
  original_id text not null,
  name text not null,
  description text,
  icon text not null,
  display_order integer not null,
  parent_category_id text,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  post_count integer not null default 0
);
alter table public.community_board_category_backups enable row level security;

create or replace function public.delete_community_board_category(p_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_category public.community_board_categories%rowtype; v_post_count integer;
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  select * into v_category from public.community_board_categories where id = p_id and is_active;
  if not found then raise exception '삭제할 하위 게시판을 찾을 수 없습니다.'; end if;
  select count(*) into v_post_count from public.community_posts where board_category_id = p_id;
  insert into public.community_board_category_backups(original_id, name, description, icon, display_order, parent_category_id, deleted_by, post_count)
  values (v_category.id, v_category.name, v_category.description, v_category.icon, v_category.display_order, v_category.parent_category_id, auth.uid(), v_post_count);
  delete from public.community_board_categories where id = p_id;
end; $$;
grant execute on function public.delete_community_board_category(text) to authenticated;

-- 필요할 때 최근 백업을 선택해 해당 게시판을 되살릴 수 있는 관리자 전용 복구 함수.
create or replace function public.restore_community_board_category(p_backup_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_backup public.community_board_category_backups%rowtype;
begin
  if not public.community_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  select * into v_backup from public.community_board_category_backups where id = p_backup_id;
  if not found then raise exception '백업을 찾을 수 없습니다.'; end if;
  insert into public.community_board_categories(id, name, description, icon, display_order, parent_category_id, is_active)
  values (v_backup.original_id, v_backup.name, v_backup.description, v_backup.icon, v_backup.display_order, v_backup.parent_category_id, true)
  on conflict (id) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, display_order = excluded.display_order, parent_category_id = excluded.parent_category_id, is_active = true;
  return v_backup.original_id;
end; $$;
grant execute on function public.restore_community_board_category(uuid) to authenticated;
