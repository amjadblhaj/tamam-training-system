import { z } from "zod";

export const createStudentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().regex(/^\d{10}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام"),
  branchId: z.coerce.number().int().positive("الفرع مطلوب"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateStudentFormInput = z.input<typeof createStudentSchema>;
