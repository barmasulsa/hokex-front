-- The public comment view validates post visibility itself, so it must run with the view owner's rights.
alter view public.community_post_comments_public set (security_invoker = false);
