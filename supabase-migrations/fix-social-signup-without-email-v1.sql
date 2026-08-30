-- Social providers can return only a stable user identifier.  In particular,
-- the current Naver scope does not request an email address, so email must not
-- prevent Auth from creating the new user and its community profile.
ALTER TABLE public.user_profiles
  ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_hokex_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin, nickname)
  VALUES (NEW.id, NEW.email, false, null)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.user_profiles.email);
  RETURN NEW;
END;
$$;

-- Keep exactly one profile-creation trigger on auth.users. Older setup files
-- used a second trigger that could collide with this insert.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_hokex_member_created ON auth.users;
CREATE TRIGGER on_auth_hokex_member_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_hokex_member();
