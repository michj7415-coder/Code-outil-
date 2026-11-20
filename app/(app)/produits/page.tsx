import type { Metadata } from "next";
import Link from "next/link";
import { Alert, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { IconPlus, IconShirt } from "@/components/icons";
import { MarginLegend, ProductRows } from "@/components/product-rows";
import { getSettings, listProducts, signedPhotoUrls } from "@/lib/data";
import { buildInsights } from "@/lib/insights";
import { requireUser } from "@/lib/supabase/server";
import { duplicateProduct } from "./actions";

export const metadata: Metadata = { title: "Mes produits" };

export default async function ProduitsPage({ searchParams }: PageProps<"/produits">) {
  const { erreur } = await searchParams;
  const { supabase, userId } = await requireUser();
  const [settings, products] = await Promise.all([getSettings(supabase, userId), listProducts(supabase)]);
  const photos = await signedPhotoUrls(supabase, products.map((p) => p.photoPath));
  const rows = buildInsights(products, settings);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Mes produits"
        subtitle={products.length === 0 ? "Aucun produit pour l'instant." : `${products.length} produit${products.length > 1 ? "s" : ""}`}
        action={
          <Link href="/produits/nouveau" className={buttonClass("primary")}>
            <IconPlus width={18} height={18} /> Nouveau produit
          </Link>
        }
      />

      {erreur === "duplication" && <Alert>La duplication a échoué. Réessaie.</Alert>}

      {products.length === 0 ? (
        <EmptyState
          icon={<IconShirt width={28} height={28} />}
          title="Commence par ton premier vêtement"
          text="Saisis ses tissus, accessoires et coûts de fabrication : tu connaîtras son vrai prix de revient et la marge qu'il te laisse."
          action={{ label: "Créer un produit", href: "/produits/nouveau" }}
        />
      ) : (
        <>
          <MarginLegend threshold={settings.marginThreshold} />
          <ProductRows
            rows={rows}
            photos={photos}
            currency={settings.currency}
            actions={(id) => (
              <form action={duplicateProduct}>
                <input type="hidden" name="id" value={id} />
                <button className={buttonClass("ghost", "h-9 px-2.5 text-xs")}>Dupliquer</button>
              </form>
            )}
          />
          {rows.some((r) => r.product.retailPriceTtc == null) && (
            <p className="text-xs text-muted">* Prix non saisi : la marge est calculée sur le prix conseillé.</p>
          )}
        </>
      )}
    </div>
  );
}
