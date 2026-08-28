-- Keep AKEI directly below 마이스인 and shift following boards down one position.
update public.community_board_categories set display_order = display_order + 1 where id <> 'akei' and display_order >= 11;
update public.community_board_categories set display_order = 11 where id = 'akei';
