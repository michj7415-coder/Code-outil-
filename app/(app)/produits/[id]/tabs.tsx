"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function ProductTabs({ id }: { id: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/produits/${id}`, label: "Coûts et prix" },
    { href: `/produits/${id}/simulateur`, label: "Simulateur" },
    { href: `/produits/${id}/fiche-technique`, label: "Fiche technique" },
  ];
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4" aria-label="Sections du produit">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              active ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
