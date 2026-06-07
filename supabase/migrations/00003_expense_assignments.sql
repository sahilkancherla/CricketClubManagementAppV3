-- ============================================
-- Expense splitting: payer + per-member shares
-- ============================================
-- Until now an expense was a flat record attributed only to its creator.
-- This migration lets an expense record who actually paid (paid_by_user_id)
-- and split its amount into per-member shares (expense_assignments), each of
-- which an admin can mark paid/pending — mirroring payments + payment_assignments.

-- 1. Who fronted the cost. Separate from created_by (the audit creator).
--    The FK is explicitly named so PostgREST can disambiguate the two
--    expenses -> profiles relationships (created_by and paid_by_user_id).
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS paid_by_user_id uuid;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_paid_by_user_id_fkey;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_paid_by_user_id_fkey
  FOREIGN KEY (paid_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Existing rows: default the payer to whoever created them.
UPDATE expenses SET paid_by_user_id = created_by WHERE paid_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_user_id ON expenses(paid_by_user_id);

-- ============================================
-- Expense Assignments (one share per assigned member)
-- ============================================

CREATE TABLE expense_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_cents integer NOT NULL CHECK (share_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

ALTER TABLE expense_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense shares" ON expense_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Expense shares viewable by authenticated" ON expense_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Expense shares insertable by authenticated" ON expense_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Expense shares updatable by authenticated" ON expense_assignments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Expense shares deletable by authenticated" ON expense_assignments
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_expense_assignments_expense_id ON expense_assignments(expense_id);
CREATE INDEX idx_expense_assignments_user_id ON expense_assignments(user_id);

-- ============================================
-- Re-point expense references when a placeholder is claimed
-- ============================================
-- Carries forward the 00002 trigger and adds re-pointing for the new expense
-- payer column and expense shares, so a claimed placeholder keeps its history.
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
    UPDATE public.expenses            SET created_by      = NEW.id WHERE created_by      = placeholder_id;
    UPDATE public.expenses            SET paid_by_user_id = NEW.id WHERE paid_by_user_id = placeholder_id;

    -- Expense shares: avoid violating UNIQUE(expense_id, user_id) if the real
    -- account already has a share on the same expense — drop the placeholder's
    -- duplicate first, then re-point the rest.
    DELETE FROM public.expense_assignments ea
    WHERE ea.user_id = placeholder_id
      AND EXISTS (
        SELECT 1 FROM public.expense_assignments other
        WHERE other.expense_id = ea.expense_id AND other.user_id = NEW.id
      );
    UPDATE public.expense_assignments SET user_id = NEW.id WHERE user_id = placeholder_id;

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
