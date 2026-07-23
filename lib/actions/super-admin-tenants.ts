"use server";

import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSuperAdminSession } from "@/lib/auth/get-super-admin-session";
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

  const { data: rawTenant } = await db.from("tenant_stats").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (!rawTenant) return null;
  const tenant = mapTenantStatsRow(rawTenant);

  const [{ data: subscriptions }, { data: staff }] = await Promise.all([
    db.from("subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    db.from("staff").select("id, username, role, branch_id, active, branches(name_ar)").eq("tenant_id", tenantId),
  ]);

  const staffRows: StaffRow[] = (staff ?? []).map((s) => ({
    id: s.id,
    username: s.username,
    role: s.role,
    branch_id: s.branch_id,
    branch_name_ar: (s.branches as unknown as { name_ar: string } | null)?.name_ar ?? null,
    active: s.active,
  }));

  return {
    ...tenant,
    subscriptions: subscriptions ?? [],
    staff: staffRows,
  };
}

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  await requireSuperAdmin();

  if (!input.academyName || !input.ownerName || !input.ownerEmail || !input.adminUsername || !input.adminPassword) {
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

  const planLimits: Record<string, { maxBranches: number; maxStudents: number }> = {
    basic: { maxBranches: 5, maxStudents: 500 },
    standard: { maxBranches: 10, maxStudents: 1500 },
    pro: { maxBranches: -1, maxStudents: -1 },
  };
  const limits = planLimits[input.plan] ?? planLimits.basic;

  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .insert({
      academy_name: input.academyName,
      academy_name_en: input.academyNameEn || null,
      owner_name: input.ownerName,
      owner_email: input.ownerEmail,
      owner_phone: input.ownerPhone || null,
      plan: input.plan,
      max_branches: limits.maxBranches,
      max_students: limits.maxStudents,
      status: "trial",
      trial_ends_at: new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    return { success: false, error: "حدث خطأ أثناء إنشاء الحساب" };
  }

  // Every tenant needs at least one branch to be able to add students —
  // there's no separate branch-management UI in this app (branches were
  // originally fixed/seeded, never user-managed), so seed one default.
  const { data: branch, error: branchError } = await db
    .from("branches")
    .insert({ name: "main", name_ar: "الفرع الرئيسي", tenant_id: tenant.id })
    .select("id")
    .single();

  if (branchError || !branch) {
    return { success: false, error: "حدث خطأ أثناء إنشاء الفرع الافتراضي" };
  }

  const hashed = await bcrypt.hash(input.adminPassword, 12);
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
    credentials: { username: input.adminUsername, password: input.adminPassword, academyName: input.academyName },
  };
}

export async function activateTenantSubscription(
  tenantId: string,
  input: { plan: string; months: number; paymentRef?: string }
): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("activate_subscription", {
    p_tenant_id: tenantId,
    p_plan: input.plan,
    p_months: input.months,
    p_payment_ref: input.paymentRef || null,
    p_created_by: saSession.username,
  });
  if (error || !data?.success) return { success: false, error: data?.error ?? "حدث خطأ ما" };
  return { success: true };
}

export async function suspendTenantAccount(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("suspend_tenant", { p_tenant_id: tenantId });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function reactivateTenantAccount(tenantId: string, months: number): Promise<ActionResult> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("reactivate_tenant", { p_tenant_id: tenantId, p_months: months });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function addTenantBranchAddon(
  tenantId: string,
  input: { branches: number; amount: number; paymentRef?: string }
): Promise<ActionResult> {
  const saSession = await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("add_branch_addon", {
    p_tenant_id: tenantId,
    p_branches: input.branches,
    p_amount: input.amount,
    p_payment_ref: input.paymentRef || null,
    p_created_by: saSession.username,
  });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function extendTenantTrial(tenantId: string, days: number): Promise<ActionResult> {
  await requireSuperAdmin();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("extend_trial", { p_tenant_id: tenantId, p_days: days });
  if (error || !data?.success) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}
