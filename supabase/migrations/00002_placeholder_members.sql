-- ============================================
-- Placeholder members: roster people who aren't on the app yet
-- ============================================
-- Until now every profile had to be backed by an auth.users account.
-- This migration lets a club add "placeholder" members (a profile with no
-- login). When such a person later signs up with the same email, their real
-- account claims the placeholder and inherits all of its history.

-- 1. Profiles no longer require an auth user.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Placeholder profiles get their own generated id (real users still use the
--    auth user id, supplied explicitly by the signup trigger below).
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Track email (used to identify and later claim placeholders) and a flag.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (lower(email));

-- 4. Signup handler: if an unclaimed placeholder exists with the same email,
--    create the real profile from it, re-point every reference, and delete the
--    placeholder. Otherwise create a fresh profile as before.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  placeholder_id uuid;
BEGIN
  IF NEW.email IS NOT NULL THEN
    SELECT id INTO placeholder_id
    FROM public.profiles
    WHERE is_placeholder = true AND lower(email) = lower(NEW.email)
    LIMIT 1;
  END IF;

  IF placeholder_id IS NOT NULL THEN
    -- Materialize the real profile, carrying over the placeholder's details
    -- (signup metadata wins for the name when present).
    INSERT INTO public.profiles
      (id, first_name, last_name, avatar_url, phone, paypal_email, email, is_placeholder)
    SELECT
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), first_name),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), last_name),
      avatar_url, phone, paypal_email, NEW.email, false
    FROM public.profiles
    WHERE id = placeholder_id;

    -- Re-point all references from the placeholder to the real account.
    UPDATE public.club_members       SET user_id    = NEW.id WHERE user_id    = placeholder_id;
    UPDATE public.team_members        SET user_id    = NEW.id WHERE user_id    = placeholder_id;
    UPDATE public.game_selections     SET user_id    = NEW.id WHERE user_id    = placeholder_id;
    UPDATE public.payment_assignments SET user_id    = NEW.id WHERE user_id    = placeholder_id;
    UPDATE public.expenses            SET created_by = NEW.id WHERE created_by = placeholder_id;

    DELETE FROM public.profiles WHERE id = placeholder_id;
  ELSE
    INSERT INTO public.profiles (id, first_name, last_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
