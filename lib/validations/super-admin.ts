import { z } from "zod";

export const superAdminLoginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>;

export interface SuperAdminLoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}
