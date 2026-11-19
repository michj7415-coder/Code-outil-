import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, listProducts } from "@/lib/data";
import { toPeerPrices } from "@/lib/peers";
import { requireUser } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NouveauProduitPage() {
  const { supabase, userId } = await requireUser();
  const [settings, products] = await Promise.all([getSettings(supabase, userId), listProducts(supabase)]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/produits" className="text-sm text-muted hover:text-ink">
          ← Mes produits
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Nouveau produit</h1>
      </div>
      <ProductForm
        initial={{
          name: "",
          category: "tshirt",
          laborCost: 0,
          retailPriceTtc: null,
          photoUrl: null,
          materials: [{ name: "", pricePerMeter: 0, metersUsed: 0 }],
          accessories: [],
          extraCosts: [],
        }}
        settings={settings}
        currency={settings.currency}
        peers={toPeerPrices(products, settings)}
      />
    </div>
  );
}
