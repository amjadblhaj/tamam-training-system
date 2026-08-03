"use client";

import { INPUT_CLASS } from "@/components/ui/Input";
import { WizardNavButtons } from "./WizardNavButtons";
import type { GrantWizardApi } from "@/hooks/useGrantWizard";
import type { Branch } from "@/types";

export function StepBranch({ branches, wizard }: { branches: Branch[]; wizard: GrantWizardApi }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">اختر الفرع</label>
        <select
          value={wizard.branchId ?? ""}
          onChange={(e) => wizard.setBranchId(e.target.value ? Number(e.target.value) : null)}
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            اختر الفرع...
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name_ar}
            </option>
          ))}
        </select>
      </div>
      <WizardNavButtons
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        canProceed={wizard.canProceedFromStep(1)}
        showBack={false}
      />
    </div>
  );
}
