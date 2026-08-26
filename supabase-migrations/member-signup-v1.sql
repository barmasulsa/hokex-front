-- HOKEX independent signup: create a profile whenever Supabase Auth creates a member.
-- Existing Stibee-created accounts are preserved by the conflict rule.
CREATE OR REPLACE FUNCTION public.handle_new_hokex_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin, nickname)
  VALUES (NEW.id, NEW.email, false, null)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_hokex_member_created ON auth.users;
CREATE TRIGGER on_auth_hokex_member_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_hokex_member();
