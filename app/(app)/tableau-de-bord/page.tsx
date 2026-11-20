import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, buttonClass, cx, levelStyles } from "@/components/ui";
import { IconAlert, IconArrowRight, IconChart, IconCheck, IconEdit, IconPlus, IconShirt } from "@/components/icons";
import { MarginLegend, ProductRows } from "@/components/product-rows";
import { getSettings, listProducts, signedPhotoUrls } from "@/lib/data";
import { buildDashboard } from "@/lib/insights";
import { formatPercent } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tableau de bord" };

const TODO_LIMIT = 6;

export default async function TableauDeBordPage() {
  const { supabase, userId } = await requireUser();
  const [settings, products] = await Promise.all([getSettings(supabase, userId), listProducts(supabase)]);
  const d = buildDashboard(products, settings);

  if (d.count === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Bienvenue 👋" subtitle="Ton tableau de bord se remplira dès ton premier produit." />
        <EmptyState
          icon={<IconShirt width={28} height={28} />}
          title="Commence par ton premier vêtement"
          text="Saisis ses tissus, accessoires et coûts de fabrication : tu sauras ce qu'il te coûte vraiment et la marge qu'il te laisse."
          action={{ label: "Créer mon premier produit", href: "/produits/nouveau" }}
        />
      </div>
    );
  }

  const photos = await signedPhotoUrls(supabase, d.rows.slice(0, 8).map((r) => r.product.photoPath));
  const todos = d.todos.slice(0, TODO_LIMIT);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PageHeader
        title="Tableau de bord"
        subtitle="L'essentiel de ta collection en un coup d'œil."
        action={
          <Link href="/produits/nouveau" className={buttonClass("primary")}>
            <IconPlus width={18} height={18} /> Nouveau produit
          </Link>
        }
      />

      {/* Cartes */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-label="Indicateurs">
        <StatCard
          label="Produits"
          value={String(d.count)}
          hint={`${d.completeCount} fiche${d.completeCount > 1 ? "s" : ""} complète${d.completeCount > 1 ? "s" : ""}`}
          icon={<IconShirt />}
        />
        <StatCard
          label="Marge moyenne"
          value={formatPercent(d.averageMargin, 0)}
          valueClass={levelStyles[d.averageLevel].text}
          hint={`Ton seuil : ${formatPercent(settings.marginThreshold)}`}
          icon={<IconChart />}
        />
        <StatCard
          className="col-span-2 lg:col-span-1"
          label="Produits en alerte"
          value={String(d.alertCount)}
          valueClass={d.alertCount > 0 ? "text-bad" : "text-ok"}
          hint={d.alertCount > 0 ? "Marge sous ton seuil" : "Toutes tes marges sont au-dessus du seuil"}
          icon={d.alertCount > 0 ? <IconAlert /> : <IconCheck />}
        />
      </section>

      {/* À faire maintenant */}
      <section aria-labelledby="todo-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="todo-title" className="text-lg font-semibold">
            À faire maintenant
          </h2>
          {d.todos.length > TODO_LIMIT && <span className="text-xs text-muted">{d.todos.length - TODO_LIMIT} autres actions</span>}
        </div>
        {todos.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50/60 p-5 text-sm text-ok">
            <IconCheck />
            Rien d&apos;urgent : tes marges sont au-dessus du seuil et tes fiches sont complètes.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((t) => (
              <li key={`${t.kind}-${t.productId}`}>
                <Link
                  href={t.href}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-stone-300"
                >
                  <span
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      t.kind === "marge" ? levelStyles[t.level].soft : "bg-accent-soft text-accent",
                    )}
                  >
                    {t.kind === "marge" ? <IconAlert width={18} height={18} /> : <IconEdit width={18} height={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.productName}</span>
                    <span className="block text-xs text-muted">{t.text}</span>
                  </span>
                  <span className="hidden items-center gap-1 text-sm font-medium text-accent sm:flex">
                    {t.cta} <IconArrowRight width={16} height={16} />
                  </span>
                  <IconArrowRight width={18} height={18} className="text-muted sm:hidden" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Produits */}
      <section aria-labelledby="products-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="products-title" className="text-lg font-semibold">
            Mes produits
          </h2>
          <Link href="/produits" className="text-sm font-medium text-accent hover:underline">
            Tout voir
          </Link>
        </div>
        <MarginLegend threshold={settings.marginThreshold} />
        <ProductRows rows={d.rows.slice(0, 8)} photos={photos} currency={settings.currency} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  valueClass,
  className,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  valueClass?: string;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl border border-line bg-white p-4 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
        <span className="text-stone-400">{icon}</span>
      </div>
      <p className={cx("mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-4xl", valueClass)}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
