-- ============================================
-- Search/index tuning
-- ============================================
-- Btree indexes can't serve leading-wildcard ILIKE ('%q%'), so those searches
-- were sequential-scanning. Add a trigram index for the one unbounded search
-- (club name) and an exact-match index for the add-member email lookup.

-- Trigram matching for ILIKE/LIKE.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GET /clubs/search does `name ILIKE '%q%'` across ALL clubs. A GIN trigram
-- index turns that full scan into an index scan (for patterns >= 3 chars).
CREATE INDEX IF NOT EXISTS idx_clubs_name_trgm ON clubs USING gin (name gin_trgm_ops);

-- Adding a member resolves an existing profile by exact email. Emails are
-- normalized to lowercase on write (GoTrue lowercases auth emails; the app
-- lowercases on insert/update), so an exact-match btree index serves it.
CREATE INDEX IF NOT EXISTS idx_profiles_email_exact ON profiles (email);
