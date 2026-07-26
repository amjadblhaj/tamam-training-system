-- ============================================================
-- MAZAYA — Phase 2: Multi-Tenant Upgrade
-- Run this entire file in the Supabase SQL Editor, top to bottom.
-- Safe to run once on the existing Tamam database — adds new
-- tables/columns only, never drops or alters existing ones.
-- ============================================================

-- 1. TENANTS
CREATE TABLE tenants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_name         TEXT NOT NULL,
  academy_name_en      TEXT,
  owner_name           TEXT NOT NULL,
  owner_email          TEXT NOT NULL UNIQUE,
  owner_phone          TEXT,

  plan                 TEXT CHECK (plan IN ('basic','standard','pro')) DEFAULT 'basic',
  max_branches         INTEGER DEFAULT 5,
  max_students         INTEGER DEFAULT 500,
  status               TEXT CHECK (status IN ('trial','active','suspended','expired'))
                       DEFAULT 'trial',

  trial_ends_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  subscription_ends_at TIMESTAMPTZ,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. tenant_id ON EXISTING TABLES
ALTER TABLE branches    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE staff       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE students    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE rewards     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE points_log  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3. BACKFILL — turn your existing academy into tenant #1 so nothing
--    currently live (admin login, branches, rewards) breaks.
--    Status: active, no expiry (not a trial customer of your own platform).
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO tenants (academy_name, academy_name_en, owner_name, owner_email, plan, max_branches, max_students, status, subscription_ends_at)
  VALUES ('أكاديمية قرار للتدريب والتطوير', 'Qarar Training Center', 'Admin', 'admin@qarar.local', 'pro', -1, -1, 'active', NULL)
  RETURNING id INTO v_tenant_id;

  UPDATE branches    SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE staff       SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE students    SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE rewards     SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE points_log  SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE redemptions SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
END $$;

-- Going forward every row must belong to a tenant.
ALTER TABLE branches    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE staff       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE students    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rewards     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE points_log  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE redemptions ALTER COLUMN tenant_id SET NOT NULL;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_branches_tenant    ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant       ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant    ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_phone_t   ON students(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_rewards_tenant     ON rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_points_log_tenant  ON points_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_tenant ON redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email      ON tenants(owner_email);

-- 5. SUBSCRIPTIONS LOG
CREATE TABLE subscriptions (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,
  amount        DECIMAL(10,2),
  currency      TEXT DEFAULT 'LYD',
  status        TEXT CHECK (status IN ('pending','active','cancelled','expired'))
                DEFAULT 'active',
  payment_ref   TEXT,
  note          TEXT,
  starts_at     TIMESTAMPTZ DEFAULT NOW(),
  ends_at       TIMESTAMPTZ,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BRANCH ADDONS
CREATE TABLE branch_addons (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branches    INTEGER NOT NULL DEFAULT 1,
  amount      DECIMAL(10,2) DEFAULT 50,
  currency    TEXT DEFAULT 'LYD',
  payment_ref TEXT,
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPER ADMINS (Mazaya platform owner — separate from tenant staff)
CREATE TABLE super_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password set below is bcrypt cost 12 — change it after first login.
INSERT INTO super_admins (username, password)
VALUES ('mazaya_admin', '$2b$12$fSXTQrHFzGpwEljW6vh4peQLdT6MmkLwRyyjUuv1Kh4vLdDKevLya');

-- 8. TENANT STATS VIEW
CREATE OR REPLACE VIEW tenant_stats AS
SELECT
  t.id                                                              AS tenant_id,
  t.academy_name,
  t.plan,
  t.status,
  t.max_branches,
  t.max_students,
  t.trial_ends_at,
  t.subscription_ends_at,
  t.owner_name,
  t.owner_email,
  t.owner_phone,
  COUNT(DISTINCT b.id)                                              AS branches_used,
  COUNT(DISTINCT s.id) FILTER (WHERE s.active = true)              AS students_count,
  COALESCE(SUM(ao.branches), 0)                                     AS addon_branches,
  CASE WHEN t.max_branches = -1 THEN -1 ELSE t.max_branches + COALESCE(SUM(ao.branches), 0) END AS total_branches_allowed,
  COALESCE(SUM(sub.amount) FILTER (WHERE sub.status = 'active'), 0) AS total_paid
FROM tenants t
LEFT JOIN branches      b   ON b.tenant_id = t.id
LEFT JOIN students      s   ON s.tenant_id = t.id
LEFT JOIN branch_addons ao  ON ao.tenant_id = t.id
LEFT JOIN subscriptions sub ON sub.tenant_id = t.id
GROUP BY t.id;

-- 9. HELPER RPCs

-- Check if tenant can add a branch (fixed: -1 = unlimited, matching can_add_student below)
CREATE OR REPLACE FUNCTION can_add_branch(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE v RECORD;
BEGIN
  SELECT * INTO v FROM tenant_stats WHERE tenant_id = p_tenant_id;
  IF v.status NOT IN ('active','trial') THEN
    RETURN jsonb_build_object('allowed',false,'reason','not_active');
  END IF;
  IF v.status = 'trial' AND NOW() > (SELECT trial_ends_at FROM tenants WHERE id = p_tenant_id) THEN
    RETURN jsonb_build_object('allowed',false,'reason','trial_expired');
  END IF;
  IF v.total_branches_allowed != -1 AND v.branches_used >= v.total_branches_allowed THEN
    RETURN jsonb_build_object('allowed',false,'reason','branch_limit_reached',
      'current',v.branches_used,'max',v.total_branches_allowed);
  END IF;
  RETURN jsonb_build_object('allowed',true,
    'current',v.branches_used,'max',v.total_branches_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if tenant can add a student
CREATE OR REPLACE FUNCTION can_add_student(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE v RECORD;
BEGIN
  SELECT * INTO v FROM tenant_stats WHERE tenant_id = p_tenant_id;
  IF v.status NOT IN ('active','trial') THEN
    RETURN jsonb_build_object('allowed',false,'reason','not_active');
  END IF;
  IF v.students_count >= v.max_students AND v.max_students != -1 THEN
    RETURN jsonb_build_object('allowed',false,'reason','student_limit_reached',
      'current',v.students_count,'max',v.max_students);
  END IF;
  RETURN jsonb_build_object('allowed',true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic reward redemption, tenant-scoped
CREATE OR REPLACE FUNCTION redeem_reward_v2(
  p_tenant_id  UUID,
  p_student_id INTEGER,
  p_reward_id  INTEGER,
  p_granted_by TEXT
) RETURNS JSONB AS $$
DECLARE v_s students%ROWTYPE; v_r rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM students
    WHERE id = p_student_id AND tenant_id = p_tenant_id FOR UPDATE;
  SELECT * INTO v_r FROM rewards
    WHERE id = p_reward_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','Not found');
  END IF;
  IF v_s.points < v_r.points_required THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient points');
  END IF;
  IF NOT v_r.active THEN
    RETURN jsonb_build_object('success',false,'error','Reward inactive');
  END IF;
  UPDATE students SET points = points - v_r.points_required
    WHERE id = p_student_id AND tenant_id = p_tenant_id;
  INSERT INTO points_log(tenant_id,student_id,points,action,type,granted_by,branch_id)
    VALUES(p_tenant_id,p_student_id,-v_r.points_required,
           'استبدال: '||v_r.name_ar,'redeem',p_granted_by,v_s.branch_id);
  INSERT INTO redemptions(tenant_id,student_id,reward_id,status)
    VALUES(p_tenant_id,p_student_id,p_reward_id,'pending');
  UPDATE rewards SET redeemed_count = redeemed_count + 1
    WHERE id = p_reward_id AND tenant_id = p_tenant_id;
  RETURN jsonb_build_object('success',true,
    'new_balance', v_s.points - v_r.points_required);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic point-granting, tenant-scoped (mirrors existing grant_points)
CREATE OR REPLACE FUNCTION grant_points_v2(
  p_tenant_id  UUID,
  p_student_id INTEGER,
  p_points     INTEGER,
  p_action     TEXT,
  p_type       TEXT,
  p_granted_by TEXT,
  p_note       TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE v_student students%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM students
    WHERE id = p_student_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;
  IF NOT v_student.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student is not active');
  END IF;
  IF p_points < 1 OR p_points > 9999 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points amount');
  END IF;

  UPDATE students SET points = points + p_points
    WHERE id = p_student_id AND tenant_id = p_tenant_id;

  INSERT INTO points_log (tenant_id, student_id, points, action, type, granted_by, branch_id, note)
    VALUES (p_tenant_id, p_student_id, p_points, p_action, p_type, p_granted_by, v_student.branch_id, p_note);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_student.points + p_points,
    'student_name', v_student.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admin: activate subscription
CREATE OR REPLACE FUNCTION activate_subscription(
  p_tenant_id  UUID,
  p_plan       TEXT,
  p_months     INTEGER,
  p_payment_ref TEXT,
  p_created_by  TEXT
) RETURNS JSONB AS $$
DECLARE v_mb INTEGER; v_ms INTEGER; v_amt DECIMAL;
BEGIN
  CASE p_plan
    WHEN 'basic'    THEN v_mb:=5;  v_ms:=500;  v_amt:=300;
    WHEN 'standard' THEN v_mb:=10; v_ms:=1500; v_amt:=500;
    WHEN 'pro'      THEN v_mb:=-1; v_ms:=-1;   v_amt:=800;
    ELSE RETURN jsonb_build_object('success',false,'error','Invalid plan');
  END CASE;
  UPDATE tenants SET
    plan=p_plan, max_branches=v_mb, max_students=v_ms,
    status='active',
    subscription_ends_at=NOW()+(p_months||' months')::INTERVAL
  WHERE id=p_tenant_id;
  INSERT INTO subscriptions(tenant_id,plan,amount,status,payment_ref,
    starts_at,ends_at,created_by)
  VALUES(p_tenant_id,p_plan,v_amt*p_months,'active',p_payment_ref,
    NOW(),NOW()+(p_months||' months')::INTERVAL,p_created_by);
  RETURN jsonb_build_object('success',true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admin: suspend tenant (triggers read-only mode)
CREATE OR REPLACE FUNCTION suspend_tenant(
  p_tenant_id UUID,
  p_reason    TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  UPDATE tenants SET status='suspended' WHERE id=p_tenant_id;
  RETURN jsonb_build_object('success',true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admin: reactivate tenant
CREATE OR REPLACE FUNCTION reactivate_tenant(
  p_tenant_id UUID,
  p_months    INTEGER DEFAULT 12
) RETURNS JSONB AS $$
BEGIN
  UPDATE tenants SET
    status='active',
    subscription_ends_at=NOW()+(p_months||' months')::INTERVAL
  WHERE id=p_tenant_id;
  RETURN jsonb_build_object('success',true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admin: add branch add-on
CREATE OR REPLACE FUNCTION add_branch_addon(
  p_tenant_id UUID,
  p_branches  INTEGER,
  p_amount    DECIMAL,
  p_payment_ref TEXT,
  p_created_by  TEXT
) RETURNS JSONB AS $$
BEGIN
  INSERT INTO branch_addons(tenant_id, branches, amount, payment_ref, created_by)
  VALUES (p_tenant_id, p_branches, p_amount, p_payment_ref, p_created_by);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admin: extend trial
CREATE OR REPLACE FUNCTION extend_trial(
  p_tenant_id UUID,
  p_days      INTEGER
) RETURNS JSONB AS $$
BEGIN
  UPDATE tenants
    SET trial_ends_at = GREATEST(trial_ends_at, NOW()) + (p_days || ' days')::INTERVAL
    WHERE id = p_tenant_id;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS
-- NOTE: this app never authenticates through Supabase Auth (custom JWT
-- sessions instead), so auth.uid()/auth.role() are always null here and
-- every real read/write already goes through the service-role key, which
-- bypasses RLS entirely. These policies are defense-in-depth (default-deny
-- for any hypothetical anon/authenticated-key access) — the actual tenant
-- isolation is enforced by tenant_id filters in server action code.
ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_addons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_own_tenant_branches" ON branches
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff
      WHERE id::text = auth.uid()::text LIMIT 1)
  );
CREATE POLICY "staff_own_tenant_students" ON students
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff
      WHERE id::text = auth.uid()::text LIMIT 1)
  );
CREATE POLICY "staff_own_tenant_rewards" ON rewards
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff
      WHERE id::text = auth.uid()::text LIMIT 1)
  );
CREATE POLICY "staff_own_tenant_logs" ON points_log
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff
      WHERE id::text = auth.uid()::text LIMIT 1)
  );
CREATE POLICY "staff_own_tenant_redemptions" ON redemptions
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM staff
      WHERE id::text = auth.uid()::text LIMIT 1)
  );

-- Also re-run the Phase-1 grants fix for the new tables, since Supabase's
-- default anon/authenticated/service_role grants don't automatically cover
-- tables created via the SQL Editor (same issue as supabase/fix-grants.sql).
GRANT ALL ON tenants, subscriptions, branch_addons, super_admins TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE subscriptions_id_seq, branch_addons_id_seq TO anon, authenticated, service_role;
GRANT SELECT ON tenant_stats TO anon, authenticated, service_role;
