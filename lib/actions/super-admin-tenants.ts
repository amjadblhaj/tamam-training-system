"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSuperAdminSession } from "@/lib/auth/get-super-admin-session";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessionsForSubject } from "@/lib/auth/session-store";
import { relationValue } from "@/lib/supabase/relation";
import { recordAuditLog } from "@/lib/audit";
import type {
  TenantRow,
  TenantDetail,
  StaffRow,
  CreateTenantInput,
  CreateTenantResult,
  ActionResult,
  SuperAdminDashboardStats,
} from "@/types";

async function requireSuperAdmin() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

const STATUS_PRIORITY: Record<string, number> = { suspended: 0, expired: 1, trial: 2, active: 3 };

// tenant_stats (the SQL view) exposes the tenant's id as `tenant_id`, not
// `id` — map it explicitly rather than force-casting, which previously left
// `id` as `undefined` on every row (broke every "عرض" link on this page).
function mapTenantStatsRow(row: Record<string, unknown>): TenantRow {
  return { ...row, id: row.tenant_id } as unknown as TenantRow;
}

export async function getDashboardStats(): Promise<SuperAdminDashboardStats> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data } = await db.from("tenant_stats").select("status");
  const rows = data ?? [];

  return {
    totalTenants: rows.length,
    activeTenants: rows.filter((r) => r.status === "active").length,
    trialTenants: rows.filter((r) => r.status === "trial").length,
    suspendedOrExpiredTenants: rows.filter((r) => r.status === "suspended" || r.status === "expired").length,
  };
}

export async function getTenants(): Promise<TenantRow[]> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data } = await db.from("tenant_stats").select("*");
  const rows = (data ?? []).map(mapTenantStatsRow);
  return rows.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();

  const { data: rawTenant } = await db
    .from("tenant_stats")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!rawTenant) return null;
  const tenant = mapTenantStatsRow(rawTenant);

  const [{ data: subscriptions }, { data: staff }] = await Promise.all([
    db.from("subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    db
      .from("staff")
      .select("id, username, role, branch_id, active, branches(name_ar)")
      .eq("tenant_id", tenantId),
  ]);

  const staffRows: StaffRow[] = (staff ?? []).map((s) => ({
    id: s.id,
    username: s.username,
    role: s.role,
    branch_id: s.branch_id,
    branch_name_ar: relationValue<string>(s.branches, "name_ar"),
    active: s.active,
  }));

  return {
    ...tenant,
    subscriptions: subscriptions ?? [],
    staff: staffRows,
  };
}

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  const saSession = await requireSuperAdmin();

  if (
    !input.academyName ||
    !input.ownerName ||
    !input.ownerEmail ||
    !input.adminUsername ||
    !input.adminPassword
  ) {
    return { success: false, error: "يرجى تعبئة جميع الحقول المطلوبة" };
  }

  const db = getSupabaseAdmin();

  const { data: existingEmail } = await db
    .from("tenants")
    .select("id")
    .eq("owner_email", input.ownerEmail)
    .maybeSingle();
  if (existingEmail) {
    return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
  }

  const { data: existingUsername } = await db
    .from("staff")
    .select("id")
    .eq("username", input.adminUsername)
    .maybeSingle();
  if (existingUsername) {
    return { success: false, error: "اسم المستخدم مستخدم بالفعل" };
  }

  // Starting limits for a new tenant — no plan/pricing tiers anymore, the
  // super admin adjusts max_branches per tenant directly (Set Max Branches).
  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .insert({
      academy_name: input.academyName,
      academy_name_en: input.academyNameEn || null,
      owner_name: input.ownerName,
      owner_email: input.ownerEmail,
      owner_phone: input.ownerPhone || null,
      plan: "basic",
      max_branches: 5,
      max_students: 500,
      status: "trial",
      trial_ends_at: new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    return { success: false, error: "حدث خطأ أثناء إنشاء الحساب" };
  }

  // Every tenant needs at least one branch to be able to add students.
  // `name` is never displayed anywhere (only name_ar is) but has a UNIQUE
  // constraint — a literal "main" here collided across tenants (a real bug:
  // the second tenant created after the first would fail this insert), so
  // generate a unique value instead.
  const { data: branch, error: branchError } = await db
    .from("branches")
    .insert({ name: `branch-${crypto.randomUUID()}`, name_ar: "الفرع الرئيسي", tenant_id: tenant.id })
    .select("id")
    .single();

  if (branchError || !branch) {
    return { success: false, error: "حدث خطأ أثناء إنشاء الفرع الافتراضي" };
  }

  const hashed = await hashPassword(input.adminPassword);
  const { error: staffError } = await db.from("staff").insert({
    username: input.adminUsername,
    password: hashed,
    branch_id: branch.id,
    role: "admin",
    tenant_id: tenant.id,
  });

  if (staffError) {
    return { success: false, error: "حدث خطأ أثناء إنشاء حساب المدير" };
  }

  await recordAuditLog({
    tenantId: tenant.id,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "tenant_created",
    entity: "tenant",
    entityId: tenant.id,
    metadata: { academyName: input.academyName },
  });

  await db.from("rewards").insert([
    {
      name_ar: "خصم 50%",
      name_en: "50% Discount",
      description: "خصم 50% على أي كورس في الأكاديمية",
      points_required: 400,
      tenant_id: tenant.id,
    },
    {
      name_ar: "كورس مجاني",
      name_en: "Free Course",
      description: "كورس مجاني بالكامل حسب الاختيار",
      points_required: 750,
      tenant_id: tenant.id,
    },
  ]);

  return {
    success: true,
    credentials: {
      username: input.adminUsername,
      password: input.adminPassword,
      academyName: input.academyName,
    },
  };
}

export async function activateTenantSubscription(
  tenantId: string,
  input: { months: number; paymentRef?: string }
): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();

  // No plan/pricing tiers — this just sets the tenant active with a new
  // expiry date. max_branches/max_students are managed separately (Set Max
  // Branches), not derived from a plan here.
  const endsAt = new Date(Date.now() + input.months * 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await db
    .from("tenants")
    .update({ status: "active", subscription_ends_at: endsAt })
    .eq("id", tenantId);
  if (updateError) return { success: false, error: "حدث خطأ ما" };

  await db.from("subscriptions").insert({
    tenant_id: tenantId,
    plan: "basic",
    amount: null,
    status: "active",
    payment_ref: input.paymentRef || null,
    starts_at: new Date().toISOString(),
    ends_at: endsAt,
    created_by: saSession.username,
  });

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "subscription_activated",
    entity: "tenant",
    entityId: tenantId,
    metadata: { months: input.months },
  });

  return { success: true };
}

export async function suspendTenantAccount(tenantId: string): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("suspend_tenant", { p_tenant_id: tenantId });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "tenant_suspended",
    entity: "tenant",
    entityId: tenantId,
  });

  return { success: true };
}

export async function reactivateTenantAccount(tenantId: string, months: number): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("reactivate_tenant", { p_tenant_id: tenantId, p_months: months });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "tenant_reactivated",
    entity: "tenant",
    entityId: tenantId,
    metadata: { months },
  });

  return { success: true };
}

export async function addTenantBranchAddon(
  tenantId: string,
  input: { branches: number; paymentRef?: string }
): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("add_branch_addon", {
    p_tenant_id: tenantId,
    p_branches: input.branches,
    p_amount: 0,
    p_payment_ref: input.paymentRef || null,
    p_created_by: saSession.username,
  });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "branch_addon_added",
    entity: "tenant",
    entityId: tenantId,
    metadata: { branches: input.branches },
  });

  return { success: true };
}

export async function extendTenantTrial(tenantId: string, days: number): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("extend_trial", { p_tenant_id: tenantId, p_days: days });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "trial_extended",
    entity: "tenant",
    entityId: tenantId,
    metadata: { days },
  });

  return { success: true };
}

export async function setTenantMaxBranches(tenantId: string, maxBranches: number): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  if (!Number.isInteger(maxBranches) || (maxBranches < 1 && maxBranches !== -1)) {
    return { success: false, error: "قيمة غير صحيحة" };
  }
  const db = getSupabaseAdmin();
  const { error } = await db.from("tenants").update({ max_branches: maxBranches }).eq("id", tenantId);
  if (error) return { success: false, error: "حدث خطأ ما" };

  await recordAuditLog({
    tenantId,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "max_branches_changed",
    entity: "tenant",
    entityId: tenantId,
    metadata: { maxBranches },
  });

  return { success: true };
}

export async function resetStaffPassword(staffId: string, newPassword: string): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "كلمة المرور يجب ألا تقل عن 6 أحرف" };
  }
  const db = getSupabaseAdmin();
  const hashed = await hashPassword(newPassword);
  const { error } = await db.from("staff").update({ password: hashed }).eq("id", staffId);
  if (error) return { success: false, error: "حدث خطأ ما" };

  // A leaked/forgotten old password shouldn't leave existing sessions valid.
  await revokeAllSessionsForSubject("staff", staffId);
  await recordAuditLog({
    tenantId: null,
    actor: saSession.username,
    actorRole: "super_admin",
    action: "staff_password_reset",
    entity: "staff",
    entityId: staffId,
  });

  return { success: true };
}

export async function deleteTenant(tenantId: string): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();

  const { data: tenant } = await db.from("tenants").select("academy_name").eq("id", tenantId).maybeSingle();

  // Cascades to branches/staff/students/rewards/points_log/redemptions/
  // subscriptions/branch_addons/sessions via ON DELETE CASCADE (schema.sql,
  // the Mazaya migration, and sessions-upgrade.sql) — deleting the tenant
  // row is sufficient, and immediately invalidates every session for it.
  const { error } = await db.from("tenants").delete().eq("id", tenantId);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف الحساب" };

  await recordAuditLog({
    tenantId: null, // the tenant row is gone — FK would reject a non-null reference
    actor: saSession.username,
    actorRole: "super_admin",
    action: "tenant_deleted",
    entity: "tenant",
    entityId: tenantId,
    metadata: { academyName: tenant?.academy_name },
  });

  return { success: true };
}
