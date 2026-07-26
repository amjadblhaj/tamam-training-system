import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "green" | "orange";
}

export function MetricCard({ label, value, icon: Icon, accent = "green" }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-brand-text-2">{label}</p>
        <div
          className={`rounded-lg p-2 ${
            accent === "green"
              ? "bg-brand-green-light text-brand-green"
              : "bg-brand-orange-light text-brand-orange"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold text-brand-text">{value}</p>
    </div>
  );
}
