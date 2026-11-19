import type { Metadata } from "next";
import { loadProduct } from "../load";
import { Simulator } from "./simulator";

export const metadata: Metadata = { title: "Simulateur" };

export default async function SimulateurPage({ params }: PageProps<"/produits/[id]/simulateur">) {
  const { id } = await params;
  const { product, settings } = await loadProduct(id);
  return (
    <Simulator
      input={{
        materials: product.materials,
        accessories: product.accessories,
        laborCost: product.laborCost,
        extraCosts: product.extraCosts,
      }}
      retailPriceTtc={product.retailPriceTtc}
      settings={settings}
      currency={settings.currency}
      defaultFixedCosts={settings.fixedCosts}
    />
  );
}
