-- Run this in the Supabase SQL Editor after schema.sql.
-- Atomic point-granting function, mirroring redeem_reward's row-locking
-- pattern, used by both the manual Grant Points page and the Excel batch
-- importer so a concurrent grant/redeem can never race on the same student.

CREATE OR REPLACE FUNCTION grant_points(
  p_student_id INTEGER,
  p_points     INTEGER,
  p_action     TEXT,
  p_type       TEXT,
  p_granted_by TEXT,
  p_note       TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_student students%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;
  IF NOT v_student.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student is not active');
  END IF;
  IF p_points < 1 OR p_points > 9999 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points amount');
  END IF;

  UPDATE students
    SET points = points + p_points
    WHERE id = p_student_id;

  INSERT INTO points_log (student_id, points, action, type, granted_by, branch_id, note)
    VALUES (p_student_id, p_points, p_action, p_type, p_granted_by, v_student.branch_id, p_note);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_student.points + p_points,
    'student_name', v_student.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
