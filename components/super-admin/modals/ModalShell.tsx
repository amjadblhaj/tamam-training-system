import { Modal } from "@/components/ui/Modal";

/**
 * The Super Admin panel is orange-themed (vs. the tenant panel's green), so
 * these modals intentionally don't reuse the shared green-focus
 * `components/ui/Input` — this is the one local input style still kept
 * outside that shared component.
 */
export const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text transition-shadow focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40";

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Modal title={title} onClose={onClose}>
      {children}
    </Modal>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-text">{label}</label>
      {children}
    </div>
  );
}
