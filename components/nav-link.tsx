"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={cx(
        "rounded-md px-2.5 py-1.5 text-sm",
        active ? "bg-stone-100 font-medium text-ink" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
