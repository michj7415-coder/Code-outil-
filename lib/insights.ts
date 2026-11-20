/**
 * Indicateurs pour le tableau de bord — fonctions pures.
 * Code couleur de marge, complétion des fiches et liste « À faire maintenant ».
 */
import { computePricing, round2, type PricingResult, type PricingSettings } from "./pricing";
import type { Product } from "./data";

/** Écart (en points) sous le seuil au-delà duquel la marge passe au rouge. */
export const MARGIN_ORANGE_BAND = 10;

export type MarginLevel = "ok" | "warn" | "bad" | "none";

/**
 * 🟢 ok : marge ≥ seuil
 * 🟠 warn : jusqu'à 10 points sous le seuil
 * 🔴 bad : plus de 10 points sous le seuil, ou vente à perte
 */
export function marginLevel(rate: number | null, threshold: number): MarginLevel {
  if (rate == null) return "none";
  if (rate < 0) return "bad";
  if (rate >= threshold) return "ok";
  if (rate >= threshold - MARGIN_ORANGE_BAND) return "warn";
  return "bad";
}

export type CompletionItem = { key: string; label: string; done: boolean; tab: "couts" | "fiche" };

export type Completion = { percent: number; done: number; total: number; missing: CompletionItem[]; items: CompletionItem[] };

/** Ce qui suffit à une fiche complète (accessoires et fournisseurs restent facultatifs). */
export function computeCompletion(p: Pick<Product, "name" | "photoPath" | "materials" | "laborCost" | "retailPriceTtc" | "sizes" | "workshopNotes">): Completion {
  const items: CompletionItem[] = [
    { key: "nom", label: "nom", done: p.name.trim().length > 0, tab: "couts" },
    { key: "photo", label: "photo", done: Boolean(p.photoPath), tab: "couts" },
    { key: "tissu", label: "tissu et métrage", done: p.materials.some((m) => m.name.trim() && m.metersUsed > 0), tab: "couts" },
    { key: "main-oeuvre", label: "main-d'œuvre", done: p.laborCost > 0, tab: "couts" },
    { key: "prix", label: "prix de vente", done: p.retailPriceTtc != null && p.retailPriceTtc > 0, tab: "couts" },
    { key: "mesures", label: "tableau de mesures", done: p.sizes.some((s) => [s.xs, s.s, s.m, s.l, s.xl].some((v) => v.trim())), tab: "fiche" },
    { key: "consignes", label: "consignes atelier", done: p.workshopNotes.trim().length > 0, tab: "fiche" },
  ];
  const done = items.filter((i) => i.done).length;
  return {
    percent: Math.round((done / items.length) * 100),
    done,
    total: items.length,
    missing: items.filter((i) => !i.done),
    items,
  };
}

export type ProductInsight = {
  product: Product;
  pricing: PricingResult;
  level: MarginLevel;
  completion: Completion;
};

export type Todo = {
  productId: string;
  productName: string;
  kind: "marge" | "incomplet";
  level: "bad" | "warn";
  text: string;
  href: string;
  cta: string;
};

export type Dashboard = {
  count: number;
  /** moyenne simple des marges des produits (en %), null sans produit */
  averageMargin: number | null;
  averageLevel: MarginLevel;
  alertCount: number;
  completeCount: number;
  todos: Todo[];
  rows: ProductInsight[];
};

const pct = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} %`;

export function buildInsights(products: Product[], settings: PricingSettings): ProductInsight[] {
  return products.map((product) => {
    const pricing = computePricing(product, settings, product.retailPriceTtc);
    return {
      product,
      pricing,
      level: marginLevel(pricing.marginRate, settings.marginThreshold),
      completion: computeCompletion(product),
    };
  });
}

export function buildDashboard(products: Product[], settings: PricingSettings): Dashboard {
  const rows = buildInsights(products, settings);
  const rates = rows.map((r) => r.pricing.marginRate).filter((r): r is number => r != null);
  const averageMargin = rates.length ? round2(rates.reduce((s, r) => s + r, 0) / rates.length) : null;

  // Marges sous le seuil d'abord (les plus basses en premier), puis fiches incomplètes.
  const marginTodos: Todo[] = rows
    .filter((r) => r.level === "bad" || r.level === "warn")
    .sort((a, b) => (a.pricing.marginRate ?? 0) - (b.pricing.marginRate ?? 0))
    .map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      kind: "marge",
      level: r.level as "bad" | "warn",
      text:
        r.pricing.marginAmount < 0
          ? `vendu à perte (${pct(r.pricing.marginRate ?? 0)})`
          : `marge ${pct(r.pricing.marginRate ?? 0)}, sous ton seuil de ${pct(settings.marginThreshold)}`,
      href: `/produits/${r.product.id}`,
      cta: "Corriger",
    }));

  const incompleteTodos: Todo[] = rows
    .filter((r) => r.completion.missing.length > 0)
    .sort((a, b) => a.completion.percent - b.completion.percent)
    .map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      kind: "incomplet",
      level: "warn",
      text: `il manque : ${r.completion.missing.map((m) => m.label).join(", ")}`,
      href: r.completion.missing[0].tab === "fiche" ? `/produits/${r.product.id}/fiche-technique` : `/produits/${r.product.id}`,
      cta: "Compléter",
    }));

  return {
    count: rows.length,
    averageMargin,
    averageLevel: marginLevel(averageMargin, settings.marginThreshold),
    alertCount: marginTodos.length,
    completeCount: rows.filter((r) => r.completion.missing.length === 0).length,
    todos: [...marginTodos, ...incompleteTodos],
    rows,
  };
}
