import { z } from "zod";

export const createStudentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().regex(/^\d{10}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام"),
  branchId: z.coerce.number().int().positive("الفرع مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateStudentFormInput = z.input<typeof createStudentSchema>;
