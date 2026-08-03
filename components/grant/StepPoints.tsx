"use client";

import { Input } from "@/components/ui/Input";
import { WizardNavButtons } from "./WizardNavButtons";
import type { GrantWizardApi } from "@/hooks/useGrantWizard";

export function StepPoints({ wizard }: { wizard: GrantWizardApi }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">عدد النقاط الممنوحة (لكل مرة)</label>
        <Input
          type="number"
          min={1}
          max={9999}
          value={wizard.points || ""}
          onChange={(e) => wizard.setPoints(parseInt(e.target.value, 10) || 0)}
        />
        <p className="mt-2 text-xs text-brand-text-3">
          ملاحظة: إذا تكرر رقم الهاتف في الملف، تُضرب النقاط في عدد مرات التكرار
        </p>
      </div>
      <WizardNavButtons onBack={wizard.goBack} onNext={wizard.goNext} canProceed={wizard.canProceedFromStep(3)} />
    </div>
  );
}
