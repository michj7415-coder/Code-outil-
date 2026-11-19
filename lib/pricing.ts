/**
 * Calculs de prix — fonctions pures, sans dépendance à React ni à Supabase.
 *
 * Conventions :
 * - les montants sont en unité monétaire (ex. euros), arrondis au centime en sortie ;
 * - les taux (TVA, marge, seuil) sont exprimés en pourcentage (20 = 20 %) ;
 * - la marge est un taux de marque : (prix de vente HT − coût) / prix de vente HT.
 */

export type MaterialLine = { name: string; pricePerMeter: number; metersUsed: number };
export type AccessoryLine = { name: string; unitPrice: number; quantity: number };
export type ExtraCostLine = { label: string; kind: "amount" | "percent"; value: number };

export type CostInput = {
  materials: MaterialLine[];
  accessories: AccessoryLine[];
  laborCost: number;
  extraCosts: ExtraCostLine[];
};

export type PricingSettings = {
  vatRate: number; // %
  wholesaleCoef: number;
  retailCoef: number;
  marginThreshold: number; // %
};

export const DEFAULT_SETTINGS: PricingSettings & { currency: string; fixedCosts: number } = {
  vatRate: 20,
  wholesaleCoef: 2,
  retailCoef: 2,
  marginThreshold: 50,
  currency: "EUR",
  fixedCosts: 0,
};

/** Arrondi au centime, sans les erreurs de flottant type 1.005 → 1.00. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Remplace NaN, Infinity et valeurs négatives par 0. */
function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function materialLineTotal(m: MaterialLine): number {
  return safe(m.pricePerMeter) * safe(m.metersUsed);
}

export function accessoryLineTotal(a: AccessoryLine): number {
  return safe(a.unitPrice) * safe(a.quantity);
}

export type CostBreakdown = {
  materials: number;
  accessories: number;
  labor: number;
  /** matières + accessoires + main-d'œuvre : base des frais en % */
  subtotal: number;
  extras: number;
  /** prix de revient complet d'une pièce */
  total: number;
};

/**
 * Prix de revient d'une pièce.
 * Les frais en pourcentage s'appliquent au sous-total matières + accessoires + main-d'œuvre.
 */
export function computeCost(input: CostInput): CostBreakdown {
  const materials = input.materials.reduce((s, m) => s + materialLineTotal(m), 0);
  const accessories = input.accessories.reduce((s, a) => s + accessoryLineTotal(a), 0);
  const labor = safe(input.laborCost);
  const subtotal = materials + accessories + labor;
  const extras = input.extraCosts.reduce(
    (s, e) => s + (e.kind === "percent" ? (subtotal * safe(e.value)) / 100 : safe(e.value)),
    0,
  );
  return {
    materials: round2(materials),
    accessories: round2(accessories),
    labor: round2(labor),
    subtotal: round2(subtotal),
    extras: round2(extras),
    total: round2(subtotal + extras),
  };
}

export function htToTtc(ht: number, vatRate: number): number {
  return round2(ht * (1 + safe(vatRate) / 100));
}

export function ttcToHt(ttc: number, vatRate: number): number {
  return round2(ttc / (1 + safe(vatRate) / 100));
}

/** Taux de marque en % : (prix HT − coût) / prix HT. null si le prix est nul. */
export function marginRate(priceHt: number, cost: number): number | null {
  if (!(priceHt > 0)) return null;
  return round2(((priceHt - cost) / priceHt) * 100);
}

export type SuggestedPrices = {
  wholesaleHt: number;
  retailHt: number;
  retailTtc: number;
};

/** Prix conseillés : gros = coût × coef. de gros ; détail HT = gros × coef. de détail ; TTC = HT + TVA. */
export function suggestedPrices(cost: number, s: PricingSettings): SuggestedPrices {
  const wholesaleHt = round2(cost * safe(s.wholesaleCoef));
  const retailHt = round2(wholesaleHt * safe(s.retailCoef));
  return { wholesaleHt, retailHt, retailTtc: htToTtc(retailHt, s.vatRate) };
}

export type PricingResult = {
  cost: CostBreakdown;
  suggested: SuggestedPrices;
  /** prix de vente retenu pour la marge : le prix saisi, sinon le prix conseillé */
  priceTtc: number;
  priceHt: number;
  usesSuggestedPrice: boolean;
  marginAmount: number;
  marginRate: number | null;
  /** part du tissu dans le coût de revient, en % (null si coût nul) */
  fabricShare: number | null;
};

export function computePricing(
  input: CostInput,
  settings: PricingSettings,
  retailPriceTtc: number | null,
): PricingResult {
  const cost = computeCost(input);
  const suggested = suggestedPrices(cost.total, settings);
  const usesSuggestedPrice = retailPriceTtc == null || !(retailPriceTtc > 0);
  const priceTtc = usesSuggestedPrice ? suggested.retailTtc : round2(retailPriceTtc);
  const priceHt = usesSuggestedPrice ? suggested.retailHt : ttcToHt(priceTtc, settings.vatRate);
  return {
    cost,
    suggested,
    priceTtc,
    priceHt,
    usesSuggestedPrice,
    marginAmount: round2(priceHt - cost.total),
    marginRate: marginRate(priceHt, cost.total),
    fabricShare: cost.total > 0 ? round2((cost.materials / cost.total) * 100) : null,
  };
}

export type BreakEven =
  | { status: "ok"; units: number; unitMargin: number }
  | { status: "no-fixed-costs"; units: 0; unitMargin: number }
  | { status: "never"; units: null; unitMargin: number };

/**
 * Seuil de rentabilité : nombre de pièces à vendre pour couvrir les frais fixes.
 * unités = ⌈ frais fixes / (prix de vente HT − coût de revient) ⌉
 */
export function breakEven(fixedCosts: number, priceHt: number, unitCost: number): BreakEven {
  const unitMargin = round2(priceHt - unitCost);
  if (!(fixedCosts > 0)) return { status: "no-fixed-costs", units: 0, unitMargin };
  if (!(unitMargin > 0)) return { status: "never", units: null, unitMargin };
  // Le petit epsilon évite qu'un résultat comme 100.00000001 devienne 101.
  return { status: "ok", units: Math.ceil(fixedCosts / unitMargin - 1e-9), unitMargin };
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function formatMoney(n: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(n: number | null, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;
}
