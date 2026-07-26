import { z } from "zod";
import { PHONE_REGEX, PHONE_REGEX_MESSAGE } from "@/lib/constants";

export const staffLoginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const studentLoginSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, PHONE_REGEX_MESSAGE),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}
