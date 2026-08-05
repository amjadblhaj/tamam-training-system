-- ============================================================
-- MAZAYA — Phase 7, Change 4: new-student registration log entries
-- Run this entire file in the Supabase SQL Editor, top to bottom.
-- ============================================================

-- 1. Widen the type CHECK to allow a 'registration' notification entry
--    alongside real point transactions.
ALTER TABLE points_log DROP CONSTRAINT IF EXISTS points_log_type_check;
ALTER TABLE points_log ADD CONSTRAINT points_log_type_check
  CHECK (type IN ('grant','redeem','excel','manual','adjustment','reversal','registration'));

-- 2. undo_transaction(): also reject undoing a 'registration' entry, same
--    as it already rejects undoing a 'reversal' — these are notifications,
--    not point movements, so "undo" has no meaning for them. (Full function
--    body restated since CREATE OR REPLACE can't patch a single line.)
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

  IF v_txn.type = 'registration' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot undo a registration entry');
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
