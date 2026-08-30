-- Community board official naming update.
-- Run this once in the Supabase SQL Editor so API responses use the official display name too.
update public.community_board_categories
set name = 'MICE人(마이스인)'
where id = 'mice-in' or name = '마이스인';
