-- ============================================================
-- TAMAM Loyalty System — Database Schema
-- Run this entire file in the Supabase SQL Editor, top to bottom.
-- ============================================================

-- 1. BRANCHES
CREATE TABLE branches (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  name_ar    TEXT NOT NULL,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (name, name_ar) VALUES
  ('al-jamia',       'فرع الجامعة'),
  ('souq-al-jumaa',  'فرع سوق الجمعة'),
  ('tajoura',        'فرع تاجورة');

-- 2. STAFF
CREATE TABLE staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  branch_id  INTEGER REFERENCES branches(id),
  role       TEXT CHECK (role IN ('admin','staff')) DEFAULT 'staff',
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin (password: 'tamam@2026', bcrypt cost 12 — change after first login)
INSERT INTO staff (username, password, role)
VALUES ('admin', '$2b$12$EGGginkBG/mcTGOqNDYzuOTZYX2a9ZWafqpu94lEHonhVrMatmSi2', 'admin');

-- 3. STUDENTS
CREATE TABLE students (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  branch_id  INTEGER REFERENCES branches(id),
  password   TEXT NOT NULL,
  points     INTEGER DEFAULT 0 CHECK (points >= 0),
  active     BOOLEAN DEFAULT true,
  joined_at  DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POINTS LOG
CREATE TABLE points_log (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  points     INTEGER NOT NULL,
  action     TEXT NOT NULL,
  type       TEXT CHECK (type IN ('grant','redeem','excel','manual','adjustment')),
  granted_by TEXT NOT NULL,
  branch_id  INTEGER REFERENCES branches(id),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REWARDS
CREATE TABLE rewards (
  id              SERIAL PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description     TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  active          BOOLEAN DEFAULT true,
  redeemed_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rewards (name_ar, name_en, description, points_required) VALUES
  ('خصم 50%',    '50% Discount', 'خصم 50% على أي كورس في الأكاديمية', 400),
  ('كورس مجاني', 'Free Course',  'كورس مجاني بالكامل حسب الاختيار',   750);

-- 6. REDEMPTIONS
CREATE TABLE redemptions (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
  reward_id   INTEGER REFERENCES rewards(id),
  status      TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  note        TEXT
);

-- 7. INDEXES
CREATE INDEX idx_students_phone      ON students(phone);
CREATE INDEX idx_students_branch     ON students(branch_id);
CREATE INDEX idx_points_log_student  ON points_log(student_id);
CREATE INDEX idx_points_log_date     ON points_log(created_at DESC);
CREATE INDEX idx_redemptions_student ON redemptions(student_id);

-- 8. ATOMIC REDEMPTION FUNCTION
CREATE OR REPLACE FUNCTION redeem_reward(
  p_student_id INTEGER,
  p_reward_id  INTEGER,
  p_granted_by TEXT
) RETURNS JSONB AS $$
DECLARE
  v_student  students%ROWTYPE;
  v_reward   rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id FOR UPDATE;
  SELECT * INTO v_reward  FROM rewards  WHERE id = p_reward_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student or reward not found');
  END IF;
  IF v_student.points < v_reward.points_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  IF NOT v_reward.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward is no longer active');
  END IF;

  UPDATE students
    SET points = points - v_reward.points_required
    WHERE id = p_student_id;

  INSERT INTO points_log (student_id, points, action, type, granted_by, branch_id)
    VALUES (p_student_id, -v_reward.points_required,
            'استبدال: ' || v_reward.name_ar, 'redeem',
            p_granted_by, v_student.branch_id);

  INSERT INTO redemptions (student_id, reward_id, status)
    VALUES (p_student_id, p_reward_id, 'pending');

  UPDATE rewards SET redeemed_count = redeemed_count + 1 WHERE id = p_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_student.points - v_reward.points_required
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_students"   ON students    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_students" ON students    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_read_logs"       ON points_log  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_logs"     ON points_log  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_read_rewards"    ON rewards     FOR SELECT USING (auth.role() = 'authenticated');
