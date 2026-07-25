-- ============================================================
-- Public leaderboard links upgrade
-- Run this entire file in the Supabase SQL Editor.
-- Adds columns only — does not touch existing tables' data.
-- ============================================================

-- 1. Branches: unique token used to build each branch's public leaderboard
--    link (e.g. /leaderboard/branch/<token>). DEFAULT so every new branch
--    gets one automatically without any application code generating it.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS leaderboard_token TEXT;
ALTER TABLE branches ALTER COLUMN leaderboard_token SET DEFAULT encode(gen_random_bytes(8), 'hex');

UPDATE branches SET leaderboard_token = encode(gen_random_bytes(8), 'hex') WHERE leaderboard_token IS NULL;

ALTER TABLE branches ALTER COLUMN leaderboard_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branches_leaderboard_token_unique'
  ) THEN
    ALTER TABLE branches ADD CONSTRAINT branches_leaderboard_token_unique UNIQUE (leaderboard_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_branches_leaderboard_token ON branches(leaderboard_token);

-- 2. Tenants: unique token used to build the public "overall" leaderboard
--    link (e.g. /leaderboard/overall/<token>), combining all of that
--    tenant's branches.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS leaderboard_token TEXT;
ALTER TABLE tenants ALTER COLUMN leaderboard_token SET DEFAULT encode(gen_random_bytes(8), 'hex');

UPDATE tenants SET leaderboard_token = encode(gen_random_bytes(8), 'hex') WHERE leaderboard_token IS NULL;

ALTER TABLE tenants ALTER COLUMN leaderboard_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_leaderboard_token_unique'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_leaderboard_token_unique UNIQUE (leaderboard_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_leaderboard_token ON tenants(leaderboard_token);
