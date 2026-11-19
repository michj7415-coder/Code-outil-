import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { NavLink } from "@/components/nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireUser();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/produits" className="mr-2 text-sm font-semibold whitespace-nowrap">
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
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
