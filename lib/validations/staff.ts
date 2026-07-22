import { z } from "zod";

export const createStaffSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  branchId: z.string().optional(),
  role: z.enum(["admin", "staff"]),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
