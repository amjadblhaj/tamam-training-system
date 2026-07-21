import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-brand-text-3">
      <Icon size={32} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
