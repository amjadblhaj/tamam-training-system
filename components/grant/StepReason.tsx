"use client";

import { Input } from "@/components/ui/Input";
import { WizardNavButtons } from "./WizardNavButtons";
import { EXCEL_WIZARD_REASONS, type GrantWizardApi } from "@/hooks/useGrantWizard";

export function StepReason({ wizard }: { wizard: GrantWizardApi }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-text">سبب منح النقاط</label>
        <div className="space-y-2">
          {EXCEL_WIZARD_REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-brand-text transition-colors ${
                wizard.reason === r.value
                  ? "border-brand-green bg-brand-green-light"
                  : "border-brand-border hover:bg-brand-surface-3"
              }`}
            >
              <input
                type="radio"
                name="wizard-reason"
                checked={wizard.reason === r.value}
                onChange={() => wizard.setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      {wizard.reason === "other" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">اكتب سبب منح النقاط</label>
          <Input
            value={wizard.customReason}
            onChange={(e) => wizard.setCustomReason(e.target.value)}
            placeholder="اكتب سبب منح النقاط"
          />
        </div>
      )}

      <WizardNavButtons
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        canProceed={wizard.canProceedFromStep(2)}
        showBack={!wizard.isStaff}
      />
    </div>
  );
}
