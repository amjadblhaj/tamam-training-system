"use client";

export function WizardNavButtons({
  onBack,
  onNext,
  canProceed,
  showBack = true,
  hideNext = false,
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  showBack?: boolean;
  /** Steps that auto-advance on success (e.g. file upload) have no manual "next" to click. */
  hideNext?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
        >
          رجوع
        </button>
      ) : (
        <span />
      )}
      {!hideNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-brand-green px-6 py-2 text-sm font-semibold text-brand-dark transition active:scale-[0.98] hover:bg-brand-green-dark disabled:opacity-50 disabled:active:scale-100"
        >
          التالي
        </button>
      )}
    </div>
  );
}
