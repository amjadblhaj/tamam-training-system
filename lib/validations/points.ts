import { z } from "zod";

export const GRANT_REASONS = [
  {
    value: "course_registration",
    label: "التسجيل في كورس شهري",
    defaultPoints: 100,
    action: "التسجيل في كورس شهري",
  },
  { value: "monthly_exam", label: "مشاركة في اختبار شهري", defaultPoints: null, action: "مشاركة في اختبار شهري" },
  { value: "custom", label: "أخرى", defaultPoints: null, action: null },
] as const;

// studentId(s) aren't a bound form field here — the form manages a
// `selectedStudents` chip list outside react-hook-form, since it can hold
// one or many students. This schema only validates the shared points/reason
// fields; the server action validates the student id list separately.
export const grantPointsFieldsSchema = z
  .object({
    points: z.coerce.number().int().min(1, "الحد الأدنى نقطة واحدة").max(9999, "الحد الأقصى 9999 نقطة"),
    reason: z.enum(["course_registration", "monthly_exam", "custom"]),
    customReason: z.string().optional(),
  })
  .refine((data) => data.reason !== "custom" || (data.customReason && data.customReason.trim().length > 0), {
    message: "يرجى إدخال السبب",
    path: ["customReason"],
  });

export type GrantPointsFieldsInput = z.infer<typeof grantPointsFieldsSchema>;
export type GrantPointsFieldsFormInput = z.input<typeof grantPointsFieldsSchema>;
