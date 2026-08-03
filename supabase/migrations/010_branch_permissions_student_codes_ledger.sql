-- ============================================================
-- MAZAYA — Phase 4: Branch Permissions, Student Codes & Transaction Ledger
-- Run this entire file in the Supabase SQL Editor, top to bottom.
-- Adds columns/functions only — never drops existing data.
-- ============================================================

-- 1. BRANCH-SCOPED RLS POLICIES (students, points_log)
-- As with every other policy in this app, auth.uid() is always NULL here
-- (no Supabase Auth — custom JWT sessions instead, and every real query
-- goes through the service_role key, which bypasses RLS entirely). These
-- replacement policies are defense-in-depth only, matching the existing
-- default-deny pattern; the actual branch-level enforcement happens in
-- server action code (see lib/auth/scope.ts).
DROP POLICY IF EXISTS "staff_own_tenant_students" ON students;
CREATE POLICY "students_branch_scoped" ON students
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff WHERE id::text = auth.uid()::text LIMIT 1)
    AND (
      (SELECT role FROM staff WHERE id::text = auth.uid()::text LIMIT 1) = 'admin'
      OR branch_id = (SELECT branch_id FROM staff WHERE id::text = auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "staff_own_tenant_logs" ON points_log;
CREATE POLICY "points_log_branch_scoped" ON points_log
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff WHERE id::text = auth.uid()::text LIMIT 1)
    AND (
      (SELECT role FROM staff WHERE id::text = auth.uid()::text LIMIT 1) = 'admin'
      OR branch_id = (SELECT branch_id FROM staff WHERE id::text = auth.uid()::text LIMIT 1)
    )
  );

-- 2. BRANCH NUMBERS (per-tenant sequential: 1st branch created = 1, etc.)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_number INTEGER;

-- Backfill existing branches in creation order, per tenant.
UPDATE branches b
SET branch_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
  FROM branches
) sub
WHERE b.id = sub.id AND b.branch_number IS NULL;

ALTER TABLE branches ALTER COLUMN branch_number SET NOT NULL;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branch_number_per_tenant;
ALTER TABLE branches ADD CONSTRAINT branch_number_per_tenant UNIQUE (tenant_id, branch_number);

-- Auto-assign the next branch_number for a tenant on new branch creation.
-- Locks the tenant row first so two concurrent "add branch" calls for the
-- same tenant can't compute the same next number and collide on the
-- UNIQUE constraint above.
CREATE OR REPLACE FUNCTION assign_branch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branch_number IS NULL THEN
    PERFORM 1 FROM tenants WHERE id = NEW.tenant_id FOR UPDATE;
    SELECT COALESCE(MAX(branch_number), 0) + 1 INTO NEW.branch_number
      FROM branches WHERE tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_assign_number ON branches;
CREATE TRIGGER branches_assign_number
  BEFORE INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION assign_branch_number();

-- 3. STUDENT CODES (format: TM{xxxx}{branch_number}, e.g. TM00011)
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_sequence INTEGER;

-- Backfill existing students in creation order, per (tenant, branch) — the
-- same per-branch-restarting sequence new students will get going forward.
-- Students with no branch_id are left uncoded (student_code stays NULL;
-- the UNIQUE constraint below allows multiple NULLs).
WITH numbered AS (
  SELECT id, branch_id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, branch_id ORDER BY created_at, id) AS rn
  FROM students
  WHERE branch_id IS NOT NULL AND student_code IS NULL
)
UPDATE students s
SET student_sequence = n.rn,
    student_code = 'TM' || LPAD(n.rn::TEXT, 4, '0') || b.branch_number::TEXT
FROM numbered n
JOIN branches b ON b.id = n.branch_id
WHERE s.id = n.id;

ALTER TABLE students DROP CONSTRAINT IF EXISTS student_code_per_tenant;
ALTER TABLE students ADD CONSTRAINT student_code_per_tenant UNIQUE (tenant_id, student_code);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(tenant_id, student_code);

-- Generates the next student code for a branch. Locks the branch row so
-- two concurrent "add student" calls for the same branch can't compute the
-- same sequence number and collide on the UNIQUE constraint above.
CREATE OR REPLACE FUNCTION generate_student_code(
  p_tenant_id UUID,
  p_branch_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_branch_number INTEGER;
  v_next_seq      INTEGER;
BEGIN
  SELECT branch_number INTO v_branch_number
    FROM branches
    WHERE id = p_branch_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Branch not found');
  END IF;

  SELECT COALESCE(MAX(student_sequence), 0) + 1 INTO v_next_seq
    FROM students
    WHERE tenant_id = p_tenant_id AND branch_id = p_branch_id;

  IF v_next_seq > 9999 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum student codes reached for this branch (9999)');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'TM' || LPAD(v_next_seq::TEXT, 4, '0') || v_branch_number::TEXT,
    'sequence', v_next_seq
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRANSACTION LEDGER — undo support (no delete, ever)
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS reversed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS reversed_by TEXT;
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS reversal_of INTEGER REFERENCES points_log(id);

-- Widen the type CHECK to allow the new 'reversal' entry type.
ALTER TABLE points_log DROP CONSTRAINT IF EXISTS points_log_type_check;
ALTER TABLE points_log ADD CONSTRAINT points_log_type_check
  CHECK (type IN ('grant','redeem','excel','manual','adjustment','reversal'));

-- Atomically reverses a grant/redeem/excel/manual/adjustment transaction:
-- subtracts its points back off the student, marks the original reversed,
-- and inserts a new 'reversal' ledger entry pointing back at it. Never
-- deletes the original row — this is the only correction mechanism.
CREATE OR REPLACE FUNCTION undo_transaction(
  p_tenant_id      UUID,
  p_transaction_id INTEGER,
  p_performed_by   TEXT
) RETURNS JSONB AS $$
DECLARE
  v_txn         points_log%ROWTYPE;
  v_student     students%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_txn FROM points_log
    WHERE id = p_transaction_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF v_txn.reversed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already reversed');
  END IF;

  IF v_txn.type = 'reversal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot undo a reversal');
  END IF;

  SELECT * INTO v_student FROM students
    WHERE id = v_txn.student_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  v_new_balance := v_student.points - v_txn.points;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'التراجع سيجعل رصيد الطالب سالباً');
  END IF;

  UPDATE students SET points = v_new_balance
    WHERE id = v_txn.student_id AND tenant_id = p_tenant_id;

  UPDATE points_log
    SET reversed = true, reversed_by = p_performed_by, reversed_at = NOW()
    WHERE id = p_transaction_id AND tenant_id = p_tenant_id;

  INSERT INTO points_log (tenant_id, student_id, points, action, type, granted_by, branch_id, note, reversal_of)
    VALUES (
      p_tenant_id, v_txn.student_id, -v_txn.points,
      'تراجع عن: ' || v_txn.action, 'reversal', p_performed_by,
      v_txn.branch_id, 'حركة عكسية تلقائية', p_transaction_id
    );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No explicit grants needed below this line: migration 008's
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ... TO service_role` already
-- covers new columns/functions on existing tables, and anon/authenticated
-- intentionally get nothing (same tightened posture as 008).
