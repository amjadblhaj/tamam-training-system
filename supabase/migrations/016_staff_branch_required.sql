-- ============================================================
-- MAZAYA — Phase 9, Change 1: staff must belong to a branch
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- A staff member is scoped to exactly one branch (every branch-scoping rule
-- in the app depends on that), so branch_id can't be null for them. An admin
-- oversees all branches and may legitimately have none.
--
-- Verified before writing this: no existing row violates the constraint.
-- ============================================================

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_branch_required;
ALTER TABLE staff ADD CONSTRAINT staff_branch_required
  CHECK (role = 'admin' OR branch_id IS NOT NULL);
