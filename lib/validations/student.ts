import { z } from "zod";
import { PHONE_REGEX, PHONE_REGEX_MESSAGE } from "@/lib/constants";

export const createStudentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().regex(PHONE_REGEX, PHONE_REGEX_MESSAGE),
  branchId: z.coerce.number().int().positive("الفرع مطلوب"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateStudentFormInput = z.input<typeof createStudentSchema>;
