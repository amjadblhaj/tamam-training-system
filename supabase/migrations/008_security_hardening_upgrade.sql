-- ============================================================
-- Security hardening upgrade (Track B security audit fixes)
-- Run this entire file in the Supabase SQL Editor, top to bottom.
-- ============================================================

-- 1. CRITICAL: revoke the anon/authenticated grant on tenant_stats.
--    Postgres views execute with the VIEW OWNER's privileges, not the
--    querying role's — so RLS on the underlying tables (tenants, students,
--    branches, etc.) does NOT apply when querying through this view. The
--    view owner (created via the SQL Editor) bypasses RLS, so
--    `GRANT SELECT ON tenant_stats TO anon` (added in
--    mazaya-tenant-upgrade.sql and fix-tenant-stats-view.sql) let anyone
--    holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY read every tenant's
--    academy name, owner email/phone, plan, and revenue — confirmed live
--    and exploitable with zero authentication. The app only ever queries
--    this view via the service_role key, which isn't affected by REVOKE.
REVOKE SELECT ON tenant_stats FROM anon, authenticated;

-- 2. HIGH: tighten anon/authenticated from blanket ALL to nothing.
--    fix-grants.sql granted anon/authenticated ALL privileges on every
--    table (and, via ALTER DEFAULT PRIVILEGES, every FUTURE table too) as a
--    workaround for a missing-grants error. This app never queries Supabase
--    via the anon or authenticated key — only service_role (see
--    lib/supabase/server.ts) — so RLS was silently the *only* thing
--    standing between the public anon key and full read/write on every
--    table. Revoking removes that single point of failure; one missed
--    `ENABLE ROW LEVEL SECURITY` on a future table can no longer mean
--    instant full exposure.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- service_role keeps full access (unaffected by the REVOKEs above, but
-- restated explicitly here in case a future table is created without it).
GRANT USAGE ON SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 3. HIGH: students.phone must be unique per tenant, not platform-wide.
--    The original single-tenant schema declared `phone TEXT NOT NULL
--    UNIQUE` and the Mazaya migration never dropped it — so two different
--    academies could never both have a student with the same phone number,
--    even though every application-level duplicate check is correctly
--    tenant-scoped. Two academies sharing a phone number today get a raw,
--    untranslated DB constraint-violation error on the second signup.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_phone_key;
ALTER TABLE students ADD CONSTRAINT students_phone_per_tenant UNIQUE (tenant_id, phone);

-- 4. LOW: DB-level phone format check, matching the app's actual validation
--    (lib/constants.ts's PHONE_REGEX — a generic 10-digit rule, not a
--    country-specific format) rather than assuming a phone format this app
--    was never written to enforce.
ALTER TABLE students DROP CONSTRAINT IF EXISTS phone_format;
ALTER TABLE students ADD CONSTRAINT phone_format CHECK (phone ~ '^[0-9]{10}$');

-- 5. MEDIUM: audit log for sensitive actions (login attempts, deletions,
--    subscription/status changes, bulk point grants). tenant_id is
--    nullable because Super Admin actions and failed logins (before a
--    tenant is resolved) don't have one.
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor      TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  metadata   JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON audit_log TO service_role;
GRANT ALL ON SEQUENCE audit_log_id_seq TO service_role;
