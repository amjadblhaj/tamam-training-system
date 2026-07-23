"use client";

import { useReadOnly } from "@/hooks/useReadOnly";

// TODO: replace with the real Mazaya support WhatsApp number.
const WHATSAPP_NUMBER = "YOUR_WHATSAPP_NUMBER";

export function ReadOnlyBanner() {
  const { readOnly, message, status } = useReadOnly();
  if (!readOnly) return null;

  const isSuspended = status === "suspended";

  return (
    <div
      dir="rtl"
      className={`flex flex-wrap items-center justify-between gap-3 border-b-2 px-4 py-3 md:px-6 ${
        isSuspended ? "border-[#F59E0B] bg-[#FFF3CD]" : "border-[#EF4444] bg-[#FEE2E2]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{isSuspended ? "⚠️" : "🔒"}</span>
        <div>
          <p className={`text-sm font-bold ${isSuspended ? "text-[#92400E]" : "text-[#991B1B]"}`}>{message}</p>
          <p className={`mt-0.5 text-xs ${isSuspended ? "text-[#B45309]" : "text-[#B91C1C]"}`}>
            وضع القراءة فقط — لا يمكن إجراء أي تعديلات
          </p>
        </div>
      </div>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 ${
          isSuspended ? "bg-[#F59E0B]" : "bg-[#EF4444]"
        }`}
      >
        تواصل للتجديد
      </a>
    </div>
  );
}
