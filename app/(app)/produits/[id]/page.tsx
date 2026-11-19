import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { toPeerPrices } from "@/lib/peers";
import { ProductForm } from "../product-form";
import { loadAllProducts, loadProduct } from "./load";

export async function generateMetadata({ params }: PageProps<"/produits/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { product } = await loadProduct(id);
  return { title: product.name };
}

export default async function ProduitPage({ params, searchParams }: PageProps<"/produits/[id]">) {
  const { id } = await params;
  const { cree, copie } = await searchParams;
  const [{ product, settings, photoUrl }, all] = await Promise.all([loadProduct(id), loadAllProducts()]);

  return (
    <div className="flex flex-col gap-4">
      {cree && <Alert tone="ok">Produit créé.</Alert>}
      {copie && <Alert tone="ok">Copie créée. Pense à la renommer.</Alert>}
      <ProductForm
        initial={{ ...product, photoUrl }}
        settings={settings}
        currency={settings.currency}
        peers={toPeerPrices(all, settings)}
      />
    </div>
  );
}
