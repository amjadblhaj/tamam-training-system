"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { QrCodeCell } from "@/components/shared/QrCodeCell";
import { getBranchLeaderboardLinks, getOverallLeaderboardLink } from "./actions";
import type { BranchLeaderboardLink, OverallLeaderboardLink } from "@/types";

export function LeaderboardsClient({
  initialBranchLinks,
  initialOverallLink,
}: {
  initialBranchLinks: BranchLeaderboardLink[];
  initialOverallLink: OverallLeaderboardLink | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Computed only after mount so the server-rendered markup (which has no
  // window.location) matches the client's first render — avoids a hydration
  // mismatch.
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const { data: branchLinks = initialBranchLinks } = useQuery({
    queryKey: ["leaderboard-links-branches"],
    queryFn: () => getBranchLeaderboardLinks(),
    initialData: initialBranchLinks,
  });

  const { data: overallLink = initialOverallLink } = useQuery({
    queryKey: ["leaderboard-links-overall"],
    queryFn: () => getOverallLeaderboardLink(),
    initialData: initialOverallLink,
  });

  async function handleCopy(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const overallUrl = overallLink && origin ? `${origin}/leaderboard/overall/${overallLink.leaderboard_token}` : "";
  const isEmpty = !overallLink && branchLinks.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">لوحات المتصدرين</h1>
        <p className="mt-1 text-sm text-brand-text-2">روابط عامة لمشاركة الترتيب دون الحاجة لتسجيل الدخول</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {!isEmpty ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">اللوحة</th>
                <th className="px-4 py-3 font-medium">الرابط</th>
                <th className="px-4 py-3 font-medium">نسخ</th>
                <th className="px-4 py-3 font-medium">رمز QR</th>
              </tr>
            </thead>
            <tbody>
              {overallLink && (
                <tr className="border-b border-brand-border">
                  <td className="px-4 py-3 font-semibold text-brand-text">
                    <span className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-brand-orange" /> اللوحة العامة (كل الفروع)
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-brand-text-2" dir="ltr">
                    {overallUrl}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCopy("overall", overallUrl)}
                      className="flex items-center gap-1.5 text-brand-green hover:underline"
                    >
                      {copiedKey === "overall" ? <Check size={16} /> : <Copy size={16} />}
                      {copiedKey === "overall" ? "تم النسخ" : "نسخ"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <QrCodeCell url={overallUrl} fileName="leaderboard-overall" />
                  </td>
                </tr>
              )}
              {branchLinks.map((b) => {
                const url = origin ? `${origin}/leaderboard/branch/${b.leaderboard_token}` : "";
                const key = `branch-${b.id}`;
                return (
                  <tr key={b.id} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-3 text-brand-text">{b.name_ar}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-brand-text-2" dir="ltr">
                      {url}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleCopy(key, url)}
                        className="flex items-center gap-1.5 text-brand-green hover:underline"
                      >
                        {copiedKey === key ? <Check size={16} /> : <Copy size={16} />}
                        {copiedKey === key ? "تم النسخ" : "نسخ"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <QrCodeCell url={url} fileName={`leaderboard-branch-${b.id}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Trophy} message="لا توجد فروع بعد" />
        )}
      </div>
    </div>
  );
}
