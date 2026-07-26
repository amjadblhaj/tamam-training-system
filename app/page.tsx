import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-dark text-brand-surface">
      <Image src="/logo-full.png" alt="تمام" width={220} height={110} className="h-auto w-[220px]" priority />
      <p className="text-brand-surface-2">نظام نقاط الولاء — أكاديمية قرار للتدريب والتطوير</p>
    </main>
  );
}
