import { z } from "zod";

export const staffLoginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const studentLoginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}
