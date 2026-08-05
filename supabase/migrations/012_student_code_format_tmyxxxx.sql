-- ============================================================
-- MAZAYA — Phase 7, Change 3: student code format TMxxxxY → TMYxxxx
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- Only the arrangement changes (branch number moves from the end to right
-- after "TM"); the per-branch sequence itself is untouched. Y is not
-- zero-padded — a tenant with 10+ branches naturally gets a 2-digit Y
-- (e.g. TM100001), which stays unambiguous since xxxx is always exactly
-- 4 digits.
-- ============================================================

-- 1. Rebuild every existing student_code into the new format from the
--    branch's branch_number and the student's own student_sequence —
--    both already stored, so this is a pure re-arrangement, not a
--    re-sequencing.
UPDATE students s
SET student_code = 'TM'
  || b.branch_number::TEXT
  || LPAD(s.student_sequence::TEXT, 4, '0')
FROM branches b
WHERE s.branch_id = b.id
  AND s.tenant_id = b.tenant_id
  AND s.student_code IS NOT NULL;

-- 2. Generator function: same sequencing logic as migration 010's version,
--    only the final concatenation order changes.
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
    'code', 'TM' || v_branch_number::TEXT || LPAD(v_next_seq::TEXT, 4, '0'),
    'sequence', v_next_seq
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
