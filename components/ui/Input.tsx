import { forwardRef, type InputHTMLAttributes } from "react";

/** Exported so non-`<input>` fields (e.g. `<select>`) can share the exact same look. */
export const INPUT_CLASS =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text transition-shadow focus:border-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40";
const BASE_CLASS = INPUT_CLASS;

/**
 * Shared text input styling — was independently redeclared as a local
 * `inputClass` constant in 10 different files with byte-identical Tailwind
 * classes. `forwardRef` so it works with `{...register("field")}` from
 * react-hook-form, which needs the ref.
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={className ? `${BASE_CLASS} ${className}` : BASE_CLASS} {...props} />;
});
