import { z } from "zod";

export const GRANT_REASONS = [
  { value: "course_registration", label: "تسجيل في دورة", defaultPoints: 100, action: "تسجيل في دورة" },
  { value: "referral", label: "إحالة طالب جديد", defaultPoints: 50, action: "إحالة طالب جديد" },
  { value: "course_completion", label: "إكمال دورة", defaultPoints: null, action: "إكمال دورة" },
  { value: "manual_reward", label: "مكافأة يدوية", defaultPoints: null, action: "مكافأة يدوية" },
  { value: "custom", label: "أخرى", defaultPoints: null, action: null },
] as const;

// studentId(s) aren't a bound form field here — the form manages a
// `selectedStudents` chip list outside react-hook-form, since it can hold
// one or many students. This schema only validates the shared points/reason
// fields; the server action validates the student id list separately.
export const grantPointsFieldsSchema = z
  .object({
    points: z.coerce.number().int().min(1, "الحد الأدنى نقطة واحدة").max(9999, "الحد الأقصى 9999 نقطة"),
    reason: z.enum(["course_registration", "referral", "course_completion", "manual_reward", "custom"]),
    customReason: z.string().optional(),
  })
  .refine((data) => data.reason !== "custom" || (data.customReason && data.customReason.trim().length > 0), {
    message: "يرجى إدخال السبب",
    path: ["customReason"],
  });

export type GrantPointsFieldsInput = z.infer<typeof grantPointsFieldsSchema>;
export type GrantPointsFieldsFormInput = z.input<typeof grantPointsFieldsSchema>;
