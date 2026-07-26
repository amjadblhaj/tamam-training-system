-- ============================================================
-- Revocable sessions upgrade (Track B security audit fix)
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- Every session JWT (tenant staff/student, Super Admin) now carries a
-- `sessionId` claim. This table is the server-side record that lets a
-- session be revoked before its natural expiry — e.g. on logout, or on
-- password change (every other session for that account is revoked). The
-- JWT signature alone is no longer sufficient to authenticate; a valid,
-- non-revoked, non-expired row here must also exist (see
-- lib/auth/session-store.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY,
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('staff', 'student', 'super_admin')),
  subject_id    TEXT NOT NULL,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_by_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sessions TO service_role;

-- Sessions are short-lived (8h max) and this table only grows — an old row
-- has no value once past its expires_at. Not required for correctness
-- (expired sessions are already rejected at check time), but keeps the
-- table small. Run periodically (e.g. a daily Supabase cron / pg_cron job)
-- if you set one up; safe to run manually any time in the interim.
-- DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days';
