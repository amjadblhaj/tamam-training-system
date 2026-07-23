import { z } from "zod";

export const registerStudentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().regex(/^\d{10}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
