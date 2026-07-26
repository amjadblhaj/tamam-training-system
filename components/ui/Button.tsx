import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-brand-green text-brand-dark hover:bg-brand-green-dark focus-visible:ring-brand-green/50",
  outline:
    "border border-brand-border text-brand-text-2 hover:bg-brand-surface-3 focus-visible:ring-brand-green/50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * A plain (non-submit) action button — e.g. "+ Add" buttons that open a
 * modal, as opposed to `SubmitButton` which submits a form. Was
 * independently redeclared with near-identical Tailwind classes across
 * Students/Branches/Rewards/Settings.
 */
export function Button({ variant = "primary", className, ...props }: ButtonProps): JSX.Element {
  const classes = `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIANT_CLASS[variant]}`;
  return <button type="button" className={className ? `${classes} ${className}` : classes} {...props} />;
}
