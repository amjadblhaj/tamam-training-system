export interface Branch {
  id: number;
  name: string;
  name_ar: string;
  active: boolean;
}

export interface BranchWithStats {
  id: number;
  name_ar: string;
  active: boolean;
  student_count: number;
}

export interface BranchLimitInfo {
  branches: BranchWithStats[];
  used: number;
  max: number; // -1 = unlimited
}

export interface StudentRow {
  id: number;
  full_name: string;
  phone: string;
  branch_id: number;
  branch_name_ar: string;
  points: number;
  active: boolean;
  joined_at: string;
}

export interface StudentDetail extends StudentRow {
  created_at: string;
}

export interface PointsLogEntry {
  id: number;
  student_id: number;
  points: number;
  action: string;
  type: string;
  granted_by: string;
  branch_id: number | null;
  note: string | null;
  created_at: string;
}

export interface RedemptionEntry {
  id: number;
  reward_id: number;
  reward_name_ar: string;
  status: string;
  redeemed_at: string;
}

export interface DashboardMetrics {
  totalStudents: number;
  totalPointsGranted: number;
  rewardsRedeemed: number;
  activeBranches: number;
}

export interface TopStudent {
  id: number;
  full_name: string;
  points: number;
  branch_name_ar: string;
}

export interface ActivityEntry {
  id: number;
  student_name: string;
  branch_name_ar: string;
  action: string;
  points: number;
  granted_by: string;
  created_at: string;
}

export interface GetStudentsParams {
  search?: string;
  branchId?: number | null;
  page?: number;
}

export interface GetStudentsResult {
  students: StudentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface StudentSearchResult {
  id: number;
  full_name: string;
  phone: string;
  points: number;
  branch_name_ar: string;
}

export interface GrantPointsResult {
  success: boolean;
  error?: string;
  studentName?: string;
  newBalance?: number;
}

export interface ExcelRowInput {
  phone: string;
  points: number;
  reason: string;
  rowNumber: number;
}

export interface ExcelProcessResult {
  successCount: number;
  errors: string[];
}

export interface ActivityLogRow {
  id: number;
  student_name: string;
  branch_name_ar: string;
  action: string;
  points: number;
  type: string;
  granted_by: string;
  created_at: string;
}

export interface ActivityLogParams {
  branchId?: number | null;
  type?: string | null;
  staffUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export interface ActivityLogResult {
  rows: ActivityLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Reward {
  id: number;
  name_ar: string;
  name_en: string;
  description: string | null;
  points_required: number;
  active: boolean;
  redeemed_count: number;
}

export interface PortalReward {
  id: number;
  name_ar: string;
  description: string | null;
  points_required: number;
}

export interface PortalTransaction {
  id: number;
  action: string;
  points: number;
  created_at: string;
}

export interface RedeemResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export interface StaffRow {
  id: string;
  username: string;
  role: string;
  branch_id: number | null;
  branch_name_ar: string | null;
  active: boolean;
}

export type TenantStatus = "trial" | "active" | "suspended" | "expired";

export interface TenantStatusInfo {
  academyName: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

export interface TenantRow {
  id: string;
  academy_name: string;
  academy_name_en: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  plan: string;
  max_branches: number;
  max_students: number;
  status: TenantStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  branches_used: number;
  students_count: number;
  addon_branches: number;
  total_branches_allowed: number;
  total_paid: number;
}

export interface CreateTenantInput {
  academyName: string;
  academyNameEn?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  trialDays: number;
  adminUsername: string;
  adminPassword: string;
}

export interface CreateTenantResult {
  success: boolean;
  error?: string;
  credentials?: { username: string; password: string; academyName: string };
}

export interface SuperAdminDashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedOrExpiredTenants: number;
}

export interface SubscriptionRow {
  id: number;
  plan: string;
  amount: number | null;
  currency: string;
  status: string;
  payment_ref: string | null;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
}

export interface TenantDetail extends TenantRow {
  subscriptions: SubscriptionRow[];
  staff: StaffRow[];
}
