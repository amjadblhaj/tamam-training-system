"use client";

import { useReadOnly } from "@/hooks/useReadOnly";

// TODO: replace with the real Mazaya support WhatsApp number.
const WHATSAPP_NUMBER = "YOUR_WHATSAPP_NUMBER";

export function TrialBanner() {
  const { status, trialEndsAt } = useReadOnly();
  if (status !== "trial" || !trialEndsAt) return null;

  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 5;

  return (
    <div
      dir="rtl"
      className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-sm md:px-6 ${
        isUrgent ? "border-[#FCD34D] bg-[#FEF3C7]" : "border-[#BFDBFE] bg-[#EFF6FF]"
      }`}
    >
      <span className={isUrgent ? "text-[#92400E]" : "text-[#1E40AF]"}>
        {isUrgent ? "⏰" : "ℹ️"} تجربتك المجانية تنتهي بعد <strong>{daysLeft} {daysLeft === 1 ? "يوم" : "أيام"}</strong>
      </span>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("أريد الاشتراك في مزايا")}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 ${
          isUrgent ? "bg-[#F59E0B]" : "bg-[#3B82F6]"
        }`}
      >
        اشترك الآن
      </a>
    </div>
  );
}
