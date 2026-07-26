"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Link2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { QrCodeCell } from "@/components/shared/QrCodeCell";
import { useOrigin } from "@/hooks/useOrigin";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { getBranchRegistrationLinks } from "./actions";
import type { BranchRegistrationLink } from "@/types";

export function RegistrationLinksClient({ initialData }: { initialData: BranchRegistrationLink[] }) {
  const origin = useOrigin();
  const { copiedKey, copy } = useCopyToClipboard();

  const { data } = useQuery({
    queryKey: ["registration-links"],
    queryFn: () => getBranchRegistrationLinks(),
    initialData,
  });

  const links = data ?? [];

  function urlFor(link: BranchRegistrationLink): string {
    return origin ? `${origin}/register/${link.registration_token}` : "";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">روابط التسجيل</h1>
        <p className="mt-1 text-sm text-brand-text-2">شارك رابط الفرع مع الطلاب للتسجيل الذاتي</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {links.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">الفرع</th>
                <th className="px-4 py-3 font-medium">رابط التسجيل</th>
                <th className="px-4 py-3 font-medium">نسخ</th>
                <th className="px-4 py-3 font-medium">رمز QR</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{l.name_ar}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-brand-text-2" dir="ltr">
                    {urlFor(l)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copy(String(l.id), urlFor(l))}
                      className="flex items-center gap-1.5 text-brand-green hover:underline"
                    >
                      {copiedKey === String(l.id) ? <Check size={16} /> : <Copy size={16} />}
                      {copiedKey === String(l.id) ? "تم النسخ" : "نسخ"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <QrCodeCell url={urlFor(l)} fileName={`register-branch-${l.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Link2} message="لا توجد فروع بعد" />
        )}
      </div>
    </div>
  );
}
