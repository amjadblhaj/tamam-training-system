"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

export function QrCodeCell({ url, fileName }: { url: string; fileName: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(url, { width: 160, margin: 1 }).then((result) => {
      if (!cancelled) setDataUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return <div className="h-10 w-10 animate-pulse rounded bg-brand-surface-3" />;
  }

  return (
    <a
      href={dataUrl}
      download={`${fileName}.png`}
      title="تحميل رمز QR"
      className="flex items-center gap-1.5 text-brand-green hover:underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, next/image can't optimize it */}
      <img src={dataUrl} alt="QR" className="h-10 w-10 rounded border border-brand-border" />
      <Download size={14} />
    </a>
  );
}
