"use client";

import { useReadOnly } from "@/hooks/useReadOnly";
import { ReadOnlyPlaceholder } from "@/components/shared/ReadOnlyPlaceholder";
import { BranchBadge } from "@/components/shared/BranchBadge";
import { useGrantWizard, type WizardStep } from "@/hooks/useGrantWizard";
import { StepBranch } from "./StepBranch";
import { StepReason } from "./StepReason";
import { StepPoints } from "./StepPoints";
import { StepUpload } from "./StepUpload";
import { StepReview } from "./StepReview";
import { ResultScreen } from "./ResultScreen";
import type { Branch } from "@/types";

const ALL_STEPS: { n: Exclude<WizardStep, "result">; label: string }[] = [
  { n: 1, label: "الفرع" },
  { n: 2, label: "السبب" },
  { n: 3, label: "النقاط" },
  { n: 4, label: "رفع الملف" },
  { n: 5, label: "المراجعة" },
];

interface GrantWizardProps {
  branches: Branch[];
  isStaff: boolean;
  staffBranchId: number | null;
  staffBranchName: string | null;
}

export function GrantWizard({ branches, isStaff, staffBranchId, staffBranchName }: GrantWizardProps) {
  const { canEdit } = useReadOnly();
  const wizard = useGrantWizard({ isStaff, staffBranchId });
  const visibleSteps = isStaff ? ALL_STEPS.filter((s) => s.n !== 1) : ALL_STEPS;

  if (!canEdit) {
    return <ReadOnlyPlaceholder message="منح النقاط عبر إكسل غير متاح في وضع القراءة" />;
  }

  if (wizard.step === "result") {
    return <ResultScreen wizard={wizard} />;
  }
  const step = wizard.step;

  return (
    <div className="max-w-3xl">
      {isStaff && staffBranchName && (
        <div className="mb-4">
          <BranchBadge branchName={staffBranchName} />
        </div>
      )}

      <ol className="mb-8 flex items-center">
        {visibleSteps.map((s, i) => {
          const isDone = step > s.n;
          const isCurrent = step === s.n;
          return (
            <li key={s.n} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-brand-green text-brand-dark"
                      : isDone
                        ? "bg-brand-green-light text-brand-green-dark"
                        : "bg-brand-surface-3 text-brand-text-3"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={`whitespace-nowrap text-xs font-medium ${
                    isCurrent ? "text-brand-text" : "text-brand-text-3"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < visibleSteps.length - 1 && <div className="mx-3 h-px flex-1 bg-brand-border" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && <StepBranch branches={branches} wizard={wizard} />}
      {step === 2 && <StepReason wizard={wizard} />}
      {step === 3 && <StepPoints wizard={wizard} />}
      {step === 4 && <StepUpload wizard={wizard} />}
      {step === 5 && <StepReview wizard={wizard} />}
    </div>
  );
}
