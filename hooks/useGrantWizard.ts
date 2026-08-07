"use client";

import { useMemo, useState } from "react";
import type { ExcelBatchProcessResult, ExcelBatchExecuteResult, ProcessedPhone } from "@/types";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | "result";

export const EXCEL_WIZARD_REASONS = [
  { value: "course_registration", label: "التسجيل في كورس شهري" },
  { value: "monthly_exam", label: "مشاركة في اختبار شهري" },
  { value: "other", label: "أخرى" },
] as const;

export type ExcelWizardReasonValue = (typeof EXCEL_WIZARD_REASONS)[number]["value"];

interface UseGrantWizardOptions {
  isStaff: boolean;
  staffBranchId: number | null;
}

/**
 * Pure step/state machine for the Excel granting wizard — no server calls of
 * its own. Step components (Step 3) call the server actions directly and
 * hand their results to `applyProcessResult`/`applyExecuteResult`, which is
 * also where step navigation actually advances.
 */
export function useGrantWizard({ isStaff, staffBranchId }: UseGrantWizardOptions) {
  const initialStep: WizardStep = isStaff ? 2 : 1;

  const [step, setStep] = useState<WizardStep>(initialStep);
  const [branchId, setBranchId] = useState<number | null>(isStaff ? staffBranchId : null);
  const [reason, setReason] = useState<ExcelWizardReasonValue | "">("");
  const [customReason, setCustomReason] = useState("");
  const [points, setPoints] = useState(0);
  const [processResult, setProcessResult] = useState<ExcelBatchProcessResult | null>(null);
  const [selectedNewPhones, setSelectedNewPhones] = useState<Set<string>>(new Set());
  const [excludedStudentIds, setExcludedStudentIds] = useState<Set<number>>(new Set());
  const [executeResult, setExecuteResult] = useState<ExcelBatchExecuteResult | null>(null);

  const resolvedReasonLabel = useMemo(() => {
    if (reason === "other") return customReason.trim();
    return EXCEL_WIZARD_REASONS.find((r) => r.value === reason)?.label ?? "";
  }, [reason, customReason]);

  const approvedNewPhones: ProcessedPhone[] = useMemo(() => {
    if (!processResult) return [];
    return processResult.newPhones.filter((p) => selectedNewPhones.has(p.phone));
  }, [processResult, selectedNewPhones]);

  /** Existing-branch matches minus any the user unchecked in Step 5 — all included by default. */
  const includedExistingMatches: ProcessedPhone[] = useMemo(() => {
    if (!processResult) return [];
    return processResult.existingMatches.filter((m) => !excludedStudentIds.has(m.studentId!));
  }, [processResult, excludedStudentIds]);

  function canProceedFromStep(s: WizardStep): boolean {
    switch (s) {
      case 1:
        return branchId !== null;
      case 2:
        return reason === "other" ? customReason.trim().length > 0 : reason !== "";
      case 3:
        return Number.isInteger(points) && points >= 1 && points <= 9999;
      case 4:
        return processResult !== null;
      case 5:
        return !!processResult && (includedExistingMatches.length > 0 || approvedNewPhones.length > 0);
      default:
        return true;
    }
  }

  function goNext() {
    if (!canProceedFromStep(step)) return;
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  }

  function goBack() {
    if (step === "result") setStep(5);
    else if (step === 5) setStep(4);
    else if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2 && !isStaff) setStep(1);
  }

  /** Moves to Step 5 with the freshly-processed batch; everyone starts included, per spec. */
  function applyProcessResult(result: ExcelBatchProcessResult) {
    setProcessResult(result);
    setSelectedNewPhones(new Set(result.newPhones.map((p) => p.phone)));
    setExcludedStudentIds(new Set());
    setStep(5);
  }

  function toggleExcludeExisting(studentId: number) {
    setExcludedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  /** Select all / deselect all for the existing-students section. */
  function toggleAllExistingExclusion() {
    if (!processResult) return;
    setExcludedStudentIds((prev) =>
      prev.size === 0
        ? new Set(processResult.existingMatches.map((m) => m.studentId!))
        : new Set()
    );
  }

  function toggleNewPhone(phone: string) {
    setSelectedNewPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function toggleAllNewPhones() {
    if (!processResult) return;
    setSelectedNewPhones((prev) =>
      prev.size === processResult.newPhones.length ? new Set() : new Set(processResult.newPhones.map((p) => p.phone))
    );
  }

  function applyExecuteResult(result: ExcelBatchExecuteResult) {
    setExecuteResult(result);
    setStep("result");
  }

  function reset() {
    setStep(initialStep);
    setBranchId(isStaff ? staffBranchId : null);
    setReason("");
    setCustomReason("");
    setPoints(0);
    setProcessResult(null);
    setSelectedNewPhones(new Set());
    setExcludedStudentIds(new Set());
    setExecuteResult(null);
  }

  return {
    step,
    branchId,
    setBranchId,
    reason,
    setReason,
    customReason,
    setCustomReason,
    points,
    setPoints,
    resolvedReasonLabel,
    processResult,
    applyProcessResult,
    selectedNewPhones,
    toggleNewPhone,
    toggleAllNewPhones,
    approvedNewPhones,
    excludedStudentIds,
    toggleExcludeExisting,
    toggleAllExistingExclusion,
    includedExistingMatches,
    executeResult,
    applyExecuteResult,
    canProceedFromStep,
    goNext,
    goBack,
    reset,
    isStaff,
  };
}

export type GrantWizardApi = ReturnType<typeof useGrantWizard>;
