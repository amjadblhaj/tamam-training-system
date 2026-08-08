-- ============================================================
-- MAZAYA — Phase 10, Change 1: redemption events in the activity log
-- Run this entire file in the Supabase SQL Editor, top to bottom.
--
-- The redemption request itself already logs a 'redeem' entry (see
-- redeem_reward_v2 in migration 004). This adds the missing approval entry
-- and clarifies the rejection refund's wording.
-- ============================================================

-- 1. Allow the new 'redeem_approved' notification type.
ALTER TABLE points_log DROP CONSTRAINT IF EXISTS points_log_type_check;
ALTER TABLE points_log ADD CONSTRAINT points_log_type_check
  CHECK (type IN ('grant','redeem','excel','manual','adjustment','reversal',
                  'registration','redeem_approved'));

-- 2. approve_redemption(): same guards as migration 011, plus a zero-point
--    'redeem_approved' entry so handing the reward over shows in the log.
--    Left student_visible at its default (true) — a student should see that
--    their reward was delivered; only undo hides entries from them.
CREATE OR REPLACE FUNCTION approve_redemption(
  p_tenant_id     UUID,
  p_redemption_id INTEGER,
  p_approved_by   TEXT
) RETURNS JSONB AS $$
DECLARE v_r redemptions%ROWTYPE; v_reward rewards%ROWTYPE; v_student students%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM redemptions
    WHERE id = p_redemption_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;
  IF v_r.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already processed');
  END IF;

  SELECT * INTO v_reward  FROM rewards  WHERE id = v_r.reward_id;
  SELECT * INTO v_student FROM students WHERE id = v_r.student_id AND tenant_id = p_tenant_id;

  UPDATE redemptions
    SET status = 'approved', approved_by = p_approved_by, approved_at = NOW()
    WHERE id = p_redemption_id;

  INSERT INTO points_log (tenant_id, student_id, points, action, type, granted_by, branch_id)
    VALUES (p_tenant_id, v_r.student_id, 0,
            'تم تسليم مكافأة: ' || v_reward.name_ar,
            'redeem_approved', p_approved_by, v_student.branch_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. reject_redemption(): unchanged behaviour, clearer refund wording
--    ("رفض استبدال: <reward> - استرجاع <X> نقطة").
CREATE OR REPLACE FUNCTION reject_redemption(
  p_tenant_id     UUID,
  p_redemption_id INTEGER,
  p_rejected_by   TEXT,
  p_reason        TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE v_r redemptions%ROWTYPE; v_reward rewards%ROWTYPE; v_student students%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM redemptions
    WHERE id = p_redemption_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;
  IF v_r.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already processed');
  END IF;

  SELECT * INTO v_reward  FROM rewards  WHERE id = v_r.reward_id;
  SELECT * INTO v_student FROM students WHERE id = v_r.student_id AND tenant_id = p_tenant_id FOR UPDATE;

  UPDATE students SET points = points + v_reward.points_required
    WHERE id = v_r.student_id AND tenant_id = p_tenant_id;

  INSERT INTO points_log(tenant_id, student_id, points, action, type, granted_by, branch_id, note)
    VALUES(p_tenant_id, v_r.student_id, v_reward.points_required,
           'رفض استبدال: ' || v_reward.name_ar || ' - استرجاع ' || v_reward.points_required || ' نقطة',
           'adjustment', p_rejected_by, v_student.branch_id, p_reason);

  UPDATE redemptions
    SET status = 'rejected', approved_by = p_rejected_by, approved_at = NOW(), note = p_reason
    WHERE id = p_redemption_id;
  UPDATE rewards SET redeemed_count = GREATEST(redeemed_count - 1, 0)
    WHERE id = v_r.reward_id;

  RETURN jsonb_build_object('success', true, 'refunded', v_reward.points_required);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
