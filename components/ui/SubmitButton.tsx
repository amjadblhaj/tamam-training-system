import type { ButtonHTMLAttributes } from "react";

type SubmitButtonVariant = "primary" | "danger";

// Dark text (not white) — the logo's own soft green/orange tones don't have
// enough contrast with white to comfortably pass WCAG AA, but pair well with
// the dark brand text color (~6:1 contrast, matches how the logo itself
// renders directly on light/dark backgrounds without a white overlay).
const VARIANT_CLASS: Record<SubmitButtonVariant, string> = {
  primary: "bg-brand-green hover:bg-brand-green-dark focus-visible:ring-brand-green/50",
  danger: "bg-brand-orange hover:opacity-90 focus-visible:ring-brand-orange/50",
};

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SubmitButtonVariant;
}

/**
 * The full-width submit button used at the bottom of every form/modal — was
 * independently redeclared with byte-identical Tailwind classes in 9+
 * different files (18 occurrences total, in green "primary" and orange
 * "danger" flavors).
 */
export function SubmitButton({ variant = "primary", className, ...props }: SubmitButtonProps): JSX.Element {
  const classes = `w-full rounded-lg py-2.5 font-semibold text-brand-dark transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIANT_CLASS[variant]}`;
  return <button type="submit" className={className ? `${classes} ${className}` : classes} {...props} />;
}
