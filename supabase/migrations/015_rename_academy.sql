-- ============================================================
-- MAZAYA — Phase 9, Change 3: rename the Qarar tenant
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- Matched by name rather than by id so this only ever touches the tenant
-- that actually carries the old name — every other tenant (each with their
-- own academy name) is left untouched. Safe to re-run: the WHERE clauses
-- stop matching once applied.
--
-- Note: migration 004 seeded the old name and is deliberately NOT edited —
-- applied migrations are an append-only record of what already ran.
-- ============================================================

UPDATE tenants
SET academy_name = 'مركز تمام التعليمي'
WHERE academy_name = 'أكاديمية قرار للتدريب والتطوير';

UPDATE tenants
SET academy_name_en = 'Tamam Educational Center'
WHERE academy_name_en ILIKE '%qarar%';
