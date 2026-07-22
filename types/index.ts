export interface Branch {
  id: number;
  name: string;
  name_ar: string;
  active: boolean;
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
