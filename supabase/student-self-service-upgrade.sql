-- ============================================================
-- Student self-registration + branch links + leaderboards upgrade
-- Run this entire file in the Supabase SQL Editor.
-- Adds columns only — does not touch existing tables' data.
-- ============================================================

-- 1. Students: email collected at self-registration (and available for
--    existing students too, just left null unless supplied).
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Branches: unique registration token used to build each branch's public
--    self-registration link (e.g. /register/<token>). DEFAULT so every new
--    branch (including ones created via the tenant's own "Add Branch"
--    feature, or a future tenant's seeded default branch) gets one
--    automatically without any application code needing to generate it.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS registration_token TEXT;
ALTER TABLE branches ALTER COLUMN registration_token SET DEFAULT encode(gen_random_bytes(8), 'hex');

UPDATE branches SET registration_token = encode(gen_random_bytes(8), 'hex') WHERE registration_token IS NULL;

ALTER TABLE branches ALTER COLUMN registration_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branches_registration_token_unique'
  ) THEN
    ALTER TABLE branches ADD CONSTRAINT branches_registration_token_unique UNIQUE (registration_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_branches_registration_token ON branches(registration_token);
