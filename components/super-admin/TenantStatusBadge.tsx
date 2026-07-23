const LABELS: Record<string, { label: string; className: string }> = {
  trial: { label: "تجريبي", className: "bg-brand-surface-3 text-brand-text-2" },
  active: { label: "نشط", className: "bg-brand-green-light text-brand-green" },
  suspended: { label: "موقوف", className: "bg-[#FFF3CD] text-[#92400E]" },
  expired: { label: "منتهٍ", className: "bg-[#FEE2E2] text-[#991B1B]" },
};

export function TenantStatusBadge({ status }: { status: string }) {
  const info = LABELS[status] ?? { label: status, className: "bg-brand-surface-3 text-brand-text-2" };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${info.className}`}>{info.label}</span>;
}
