"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconSettings, IconShirt } from "./icons";
import { cx } from "./ui";

export const NAV_ITEMS = [
  { href: "/tableau-de-bord", label: "Tableau de bord", short: "Accueil", Icon: IconHome },
  { href: "/produits", label: "Produits", short: "Produits", Icon: IconShirt },
  { href: "/parametres", label: "Paramètres", short: "Réglages", Icon: IconSettings },
] as const;

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(href + "/");
}

/** Navigation du haut (tablette et ordinateur). */
export function TopNav() {
  const isActive = useActive();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cx(
            "rounded-lg px-3 py-2 text-sm transition-colors",
            isActive(href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-stone-100 hover:text-ink",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Barre d'onglets en bas de l'écran (téléphone). */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map(({ href, short, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-muted")}
            >
              <Icon width={22} height={22} strokeWidth={active ? 2.2 : 1.8} />
              {short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
