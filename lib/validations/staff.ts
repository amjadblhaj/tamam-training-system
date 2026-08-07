import { z } from "zod";

export const createStaffSchema = z
  .object({
    username: z.string().min(3, "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل"),
    password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
    branchId: z.string().optional(),
    role: z.enum(["admin", "staff"]),
  })
  // A staff member is scoped to exactly one branch, so a branch is required
  // for them. An admin oversees every branch and may legitimately have none.
  // Living on the schema means the same rule enforces both in the browser
  // (via the form resolver) and on the server (createStaff re-parses input).
  .refine((data) => data.role !== "staff" || !!data.branchId, {
    message: "يجب تحديد الفرع",
    path: ["branchId"],
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
