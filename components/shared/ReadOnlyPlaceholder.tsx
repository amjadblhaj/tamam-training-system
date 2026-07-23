export function ReadOnlyPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface-2 p-12 text-center">
      <div className="mb-3 text-3xl">🔒</div>
      <p className="mb-1.5 text-sm font-semibold text-brand-text">{message}</p>
      <p className="text-xs text-brand-text-3">تواصل معنا لتجديد الاشتراك وإعادة تفعيل جميع الميزات</p>
    </div>
  );
}
