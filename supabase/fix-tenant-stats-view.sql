-- Fixes "Invalid Date" on the Super Admin tenant detail page — the
-- tenant_stats view never selected t.created_at. Safe to re-run.
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
  t.created_at,
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

GRANT SELECT ON tenant_stats TO anon, authenticated, service_role;
