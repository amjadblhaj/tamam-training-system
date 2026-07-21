"use server";

import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createStudentSchema, type CreateStudentInput } from "@/lib/validations/student";
import type {
  StudentRow,
  StudentDetail,
  PointsLogEntry,
  RedemptionEntry,
  GetStudentsParams,
  GetStudentsResult,
  ActionResult,
} from "@/types";

const PAGE_SIZE = 20;

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

export async function getStudents(params: GetStudentsParams): Promise<GetStudentsResult> {
  const db = getSupabaseAdmin();
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db
    .from("students")
    .select("id, full_name, phone, branch_id, points, active, joined_at, branches(name_ar)", { count: "exact" })
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.branchId) query = query.eq("branch_id", params.branchId);

  const safeSearch = params.search ? sanitizeSearchTerm(params.search) : "";
  if (safeSearch) query = query.or(`full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);

  const { data, count } = await query;

  const students: StudentRow[] = (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    branch_id: s.branch_id,
    branch_name_ar: (s.branches as unknown as { name_ar: string } | null)?.name_ar ?? "",
    points: s.points,
    active: s.active,
    joined_at: s.joined_at,
  }));

  return { students, total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getStudentById(id: number): Promise<StudentDetail | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("id, full_name, phone, branch_id, points, active, joined_at, created_at, branches(name_ar)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    branch_id: data.branch_id,
    branch_name_ar: (data.branches as unknown as { name_ar: string } | null)?.name_ar ?? "",
    points: data.points,
    active: data.active,
    joined_at: data.joined_at,
    created_at: data.created_at,
  };
}

export async function getStudentPointsHistory(id: number): Promise<PointsLogEntry[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("points_log")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getStudentRedemptions(id: number): Promise<RedemptionEntry[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("redemptions")
    .select("id, reward_id, status, redeemed_at, rewards(name_ar)")
    .eq("student_id", id)
    .order("redeemed_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    reward_id: r.reward_id,
    reward_name_ar: (r.rewards as unknown as { name_ar: string } | null)?.name_ar ?? "",
    status: r.status,
    redeemed_at: r.redeemed_at,
  }));
}

export async function createStudent(input: CreateStudentInput): Promise<ActionResult> {
  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { fullName, phone, branchId, password } = parsed.data;

  const db = getSupabaseAdmin();

  const { data: existing } = await db.from("students").select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return { success: false, error: "رقم الهاتف مستخدم بالفعل" };
  }

  const hashed = await bcrypt.hash(password, 12);
  const { error } = await db.from("students").insert({
    full_name: fullName,
    phone,
    branch_id: branchId,
    password: hashed,
  });

  if (error) {
    return { success: false, error: "حدث خطأ أثناء إضافة الطالب" };
  }

  return { success: true };
}

export async function deactivateStudent(id: number): Promise<ActionResult> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("students").update({ active: false }).eq("id", id);
  if (error) {
    return { success: false, error: "حدث خطأ ما" };
  }
  return { success: true };
}
