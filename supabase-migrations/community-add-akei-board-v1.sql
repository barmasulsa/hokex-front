-- Related organization board, positioned directly after 마이스인.
insert into public.community_board_categories (id, name, description, icon, display_order, is_active)
values ('akei', 'AKEI 한국전시산업진흥회', '한국전시산업진흥회 관련 정보', '🏛️', 11, true)
on conflict (id) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, display_order = excluded.display_order, is_active = excluded.is_active;
