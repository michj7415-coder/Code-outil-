import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { BottomNav, TopNav } from "@/components/nav-link";
import { IconLogout } from "@/components/icons";
import { FeedbackButton } from "@/components/feedback-button";
import { checkSetup } from "@/lib/setup-check";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, email } = await requireUser();
  const problem = await checkSetup(supabase, userId);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/tableau-de-bord" className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">PR</span>
            <span>Prix de revient</span>
          </Link>
          <TopNav />
          <div className="ml-auto flex items-center gap-1">
            <FeedbackButton />
            <span className="hidden max-w-48 truncate text-xs text-muted lg:inline" title={email}>
              {email}
            </span>
            <form action={signOut}>
              <button
                className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:bg-stone-100 hover:text-ink"
                title="Déconnexion"
              >
                <IconLogout width={18} height={18} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 md:pb-16">
        {problem ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6">
            <h1 className="text-lg font-semibold">{problem.title}</h1>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-stone-700">
              {problem.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs break-all text-muted">Détail : {problem.technical}</p>
          </div>
        ) : (
          children
        )}
      </main>
      <BottomNav />
    </div>
  );
}
