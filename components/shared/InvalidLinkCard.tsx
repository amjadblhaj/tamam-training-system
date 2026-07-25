export function InvalidLinkCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-8 text-center shadow-xl">
        <h1 className="text-xl font-bold text-brand-orange">{title}</h1>
        <p className="mt-2 text-sm text-brand-text-2">{message}</p>
      </div>
    </main>
  );
}
