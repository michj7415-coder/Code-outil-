export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-sm font-semibold tracking-wide text-muted uppercase">Prix de revient</p>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
