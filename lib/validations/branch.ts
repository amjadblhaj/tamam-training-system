import { z } from "zod";

export const createBranchSchema = z.object({
  nameAr: z.string().min(2, "اسم الفرع مطلوب"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
