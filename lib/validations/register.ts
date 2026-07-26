import { z } from "zod";
import { PHONE_REGEX, PHONE_REGEX_MESSAGE } from "@/lib/constants";

export const registerStudentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().regex(PHONE_REGEX, PHONE_REGEX_MESSAGE),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
