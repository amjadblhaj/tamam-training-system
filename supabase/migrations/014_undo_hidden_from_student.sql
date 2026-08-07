-- ============================================================
-- MAZAYA — Phase 8, Change 8: undo is invisible to the student
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- After an undo, the student should see no trace of it: neither the original
-- grant nor a reversal line — as if it never happened. Staff/admin keep the
-- full audit trail (original marked reversed + the reversal entry).
-- ============================================================

-- 1. Visibility flag. Everything existing stays visible; only undo flips it.
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS student_visible BOOLEAN NOT NULL DEFAULT true;

-- 2. undo_transaction(): same guards as migration 013 (already reversed, a
--    reversal, a registration entry, missing student, would-go-negative) —
--    all deliberately preserved — plus the new visibility handling: the
--    original grant is hidden from the student, and the reversal entry is
--    written hidden from the start.
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

  -- Mark reversed for the audit trail AND hide the original from the student.
  UPDATE points_log
    SET reversed = true, reversed_by = p_performed_by, reversed_at = NOW(),
        student_visible = false
    WHERE id = p_transaction_id AND tenant_id = p_tenant_id;

  -- The reversal entry exists purely for the staff/admin audit trail.
  INSERT INTO points_log (tenant_id, student_id, points, action, type, granted_by, branch_id, note, reversal_of, student_visible)
    VALUES (
      p_tenant_id, v_txn.student_id, -v_txn.points,
      'تراجع عن: ' || v_txn.action, 'reversal', p_performed_by,
      v_txn.branch_id, 'حركة عكسية - غير مرئية للطالب', p_transaction_id, false
    );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
