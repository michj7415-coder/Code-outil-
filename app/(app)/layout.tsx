import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { NavLink } from "@/components/nav-link";
import { checkSetup } from "@/lib/setup-check";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, email } = await requireUser();
  const problem = await checkSetup(supabase, userId);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/produits" className="mr-2 hidden text-sm font-semibold whitespace-nowrap sm:inline">
            Prix de revient
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            <NavLink href="/produits">Produits</NavLink>
            <NavLink href="/parametres">Paramètres</NavLink>
          </nav>
          <span className="hidden truncate text-xs text-muted sm:inline" title={email}>
            {email}
          </span>
          <form action={signOut}>
            <button className="rounded-md px-2 py-1 text-sm text-muted hover:bg-stone-100 hover:text-ink">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
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
    </div>
  );
}
