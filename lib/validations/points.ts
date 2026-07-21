import { z } from "zod";

export const GRANT_REASONS = [
  { value: "course_registration", label: "تسجيل في دورة", defaultPoints: 100, action: "تسجيل في دورة" },
  { value: "referral", label: "إحالة طالب جديد", defaultPoints: 50, action: "إحالة طالب جديد" },
  { value: "course_completion", label: "إكمال دورة", defaultPoints: null, action: "إكمال دورة" },
  { value: "manual_reward", label: "مكافأة يدوية", defaultPoints: null, action: "مكافأة يدوية" },
  { value: "custom", label: "أخرى", defaultPoints: null, action: null },
] as const;

export const grantPointsSchema = z
  .object({
    studentId: z.coerce.number().int().positive("يجب اختيار طالب"),
    points: z.coerce.number().int().min(1, "الحد الأدنى نقطة واحدة").max(9999, "الحد الأقصى 9999 نقطة"),
    reason: z.enum(["course_registration", "referral", "course_completion", "manual_reward", "custom"]),
    customReason: z.string().optional(),
  })
  .refine((data) => data.reason !== "custom" || (data.customReason && data.customReason.trim().length > 0), {
    message: "يرجى إدخال السبب",
    path: ["customReason"],
  });

export type GrantPointsInput = z.infer<typeof grantPointsSchema>;
export type GrantPointsFormInput = z.input<typeof grantPointsSchema>;
