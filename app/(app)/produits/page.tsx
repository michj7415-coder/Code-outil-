import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClass, cx } from "@/components/ui";
import { getSettings, listProducts, signedPhotoUrls } from "@/lib/data";
import { computePricing, formatMoney, formatPercent } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/validation/product";
import { duplicateProduct } from "./actions";

export const metadata: Metadata = { title: "Mes produits" };

export default async function ProduitsPage({ searchParams }: PageProps<"/produits">) {
  const { erreur } = await searchParams;
  const { supabase, userId } = await requireUser();
  const [settings, products] = await Promise.all([getSettings(supabase, userId), listProducts(supabase)]);
  const photos = await signedPhotoUrls(supabase, products.map((p) => p.photoPath));

  const rows = products.map((p) => ({ product: p, pricing: computePricing(p, settings, p.retailPriceTtc) }));
  const money = (n: number) => formatMoney(n, settings.currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mes produits</h1>
          <p className="text-sm text-muted">
            {products.length === 0 ? "Aucun produit pour l'instant." : `${products.length} produit${products.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/produits/nouveau" className={buttonClass("primary")}>
          + Nouveau produit
        </Link>
      </div>

      {erreur === "duplication" && <Alert>La duplication a échoué. Réessaie.</Alert>}

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="font-medium">Commence par ton premier vêtement</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Saisis ses tissus, accessoires et coûts de fabrication : tu connaîtras son vrai prix de revient et la marge qu&apos;il te laisse.
          </p>
          <Link href="/produits/nouveau" className={buttonClass("primary", "mt-5")}>
            Créer un produit
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 sm:gap-0 sm:overflow-hidden sm:rounded-xl sm:border sm:border-line sm:bg-white">
          <li className="hidden grid-cols-[48px_1fr_110px_110px_90px_auto] items-center gap-4 border-b border-line bg-stone-50 px-4 py-2 text-xs font-medium text-muted sm:grid">
            <span />
            <span>Produit</span>
            <span className="text-right">Coût de revient</span>
            <span className="text-right">Prix de vente</span>
            <span className="text-right">Marge</span>
            <span className="w-24" />
          </li>
          {rows.map(({ product: p, pricing }) => {
            const below = pricing.marginRate != null && pricing.marginRate < settings.marginThreshold;
            const photo = p.photoPath ? photos[p.photoPath] : null;
            return (
              <li
                key={p.id}
                className="relative grid grid-cols-[48px_1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white p-3 sm:grid-cols-[48px_1fr_110px_110px_90px_auto] sm:gap-4 sm:rounded-none sm:border-0 sm:border-b sm:px-4 sm:last:border-b-0"
              >
                <div className="row-span-2 h-12 w-12 overflow-hidden rounded-md bg-stone-100 sm:row-span-1">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`/produits/${p.id}`} className="block truncate font-medium after:absolute after:inset-0 hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted">{categoryLabel(p.category)}</p>
                </div>
                <p className="hidden text-right text-sm tabular-nums sm:block">{money(pricing.cost.total)}</p>
                <p className="hidden text-right text-sm tabular-nums sm:block">
                  {p.retailPriceTtc != null ? (
                    money(pricing.priceTtc)
                  ) : (
                    <span className="text-muted" title="Prix non saisi : prix conseillé">
                      {money(pricing.priceTtc)}*
                    </span>
                  )}
                </p>
                <p className={cx("hidden text-right text-sm font-medium tabular-nums sm:block", below ? "text-warn" : "text-ok")}>
                  {formatPercent(pricing.marginRate, 0)}
                </p>
                <p className="col-span-2 col-start-2 text-xs text-muted tabular-nums sm:hidden">
                  Coût {money(pricing.cost.total)} · Vente {money(pricing.priceTtc)}
                  {p.retailPriceTtc == null && "*"} ·{" "}
                  <span className={cx("font-medium", below ? "text-warn" : "text-ok")}>
                    Marge {formatPercent(pricing.marginRate, 0)}
                  </span>
                </p>
                <form action={duplicateProduct} className="relative z-10 col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <button className={buttonClass("ghost", "h-8 px-2 text-xs")}>Dupliquer</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      {rows.some((r) => r.product.retailPriceTtc == null) && (
        <p className="text-xs text-muted">* Prix non saisi : la marge est calculée sur le prix conseillé.</p>
      )}
    </div>
  );
}
