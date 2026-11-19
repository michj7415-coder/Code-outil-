import type { PeerPrice } from "./advice";
import type { Product, Settings } from "./data";
import { computePricing } from "./pricing";

/** Prix retenu (saisi ou conseillé) de chaque produit, pour comparer au sein d'une catégorie. */
export function toPeerPrices(products: Product[], settings: Settings): PeerPrice[] {
  return products.map((p) => ({
    id: p.id,
    category: p.category,
    priceTtc: computePricing(p, settings, p.retailPriceTtc).priceTtc,
  }));
}
