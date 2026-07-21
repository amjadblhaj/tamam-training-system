import { z } from "zod";

export const rewardSchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  description: z.string().optional(),
  pointsRequired: z.coerce.number().int().min(1, "يجب أن يكون العدد أكبر من صفر"),
});

export type RewardInput = z.infer<typeof rewardSchema>;
export type RewardFormInput = z.input<typeof rewardSchema>;
