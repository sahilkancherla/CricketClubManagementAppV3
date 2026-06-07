-- ============================================
-- Season-scope payments (dues)
-- ============================================
-- Dues were club-wide with no season link, so they couldn't be broken down by
-- season. This adds an optional year_id (NULL = "no season / general"), letting
-- dues be grouped by season alongside expenses.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS year_id uuid;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_year_id_fkey;

ALTER TABLE payments
  ADD CONSTRAINT payments_year_id_fkey
  FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_year_id ON payments(year_id);
