/**
 * Read-only display of a student's auto-generated code (format
 * TM{4-digit sequence}{branch number}) — never editable anywhere in the UI.
 */
export function StudentCode({ code }: { code: string | null }) {
  if (!code) return <span className="text-xs text-brand-text-3">—</span>;
  return (
    <span className="inline-block rounded-md bg-brand-surface-3 px-2 py-1 font-mono text-xs font-semibold tracking-wide text-brand-text">
      {code}
    </span>
  );
}
