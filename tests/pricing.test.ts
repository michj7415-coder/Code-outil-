import { describe, expect, it } from "vitest";
import {
  breakEven,
  computeCost,
  computePricing,
  DEFAULT_SETTINGS,
  formatMoney,
  marginRate,
  median,
  round2,
  suggestedPrices,
  ttcToHt,
  type CostInput,
} from "@/lib/pricing";

const tshirt: CostInput = {
  materials: [
    { name: "Jersey coton bio", pricePerMeter: 12, metersUsed: 1.2 }, // 14,40
    { name: "Bord-côte", pricePerMeter: 8, metersUsed: 0.1 }, // 0,80
  ],
  accessories: [
    { name: "Étiquette tissée", unitPrice: 0.35, quantity: 1 },
    { name: "Étiquette composition", unitPrice: 0.15, quantity: 1 },
    { name: "Sachet", unitPrice: 0.25, quantity: 2 },
  ], // 1,00
  laborCost: 9,
  extraCosts: [
    { label: "Transport", kind: "amount", value: 1.5 },
    { label: "Chutes", kind: "percent", value: 5 }, // 5 % de 25,20 = 1,26
  ],
};

describe("prix de revient", () => {
  it("additionne matières, accessoires, main-d'œuvre et frais", () => {
    const c = computeCost(tshirt);
    expect(c.materials).toBe(15.2);
    expect(c.accessories).toBe(1);
    expect(c.labor).toBe(9);
    expect(c.subtotal).toBe(25.2);
    expect(c.extras).toBe(2.76);
    expect(c.total).toBe(27.96);
  });

  it("applique les frais en % au sous-total hors frais", () => {
    const c = computeCost({ materials: [], accessories: [], laborCost: 100, extraCosts: [{ label: "Douane", kind: "percent", value: 12 }] });
    expect(c.total).toBe(112);
  });

  it("vaut 0 pour un produit vide", () => {
    expect(computeCost({ materials: [], accessories: [], laborCost: 0, extraCosts: [] }).total).toBe(0);
  });

  it("ignore les valeurs négatives ou invalides", () => {
    const c = computeCost({
      materials: [{ name: "x", pricePerMeter: -10, metersUsed: 2 }, { name: "y", pricePerMeter: NaN, metersUsed: 1 }],
      accessories: [{ name: "z", unitPrice: 2, quantity: -3 }],
      laborCost: Number.POSITIVE_INFINITY,
      extraCosts: [{ label: "w", kind: "amount", value: -5 }],
    });
    expect(c.total).toBe(0);
  });

  it("arrondit correctement au centime", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(computeCost({ materials: [{ name: "a", pricePerMeter: 9.99, metersUsed: 1.333 }], accessories: [], laborCost: 0, extraCosts: [] }).total).toBe(13.32);
  });
});

describe("prix conseillés", () => {
  it("coût × 2 = gros, × 2 = détail HT, + 20 % de TVA", () => {
    expect(suggestedPrices(25, DEFAULT_SETTINGS)).toEqual({ wholesaleHt: 50, retailHt: 100, retailTtc: 120 });
  });

  it("respecte les coefficients et la TVA personnalisés", () => {
    const s = { ...DEFAULT_SETTINGS, wholesaleCoef: 2.5, retailCoef: 2.2, vatRate: 5.5 };
    expect(suggestedPrices(20, s)).toEqual({ wholesaleHt: 50, retailHt: 110, retailTtc: 116.05 });
  });
});

describe("marge", () => {
  it("est un taux de marque sur le prix HT", () => {
    expect(marginRate(100, 25)).toBe(75);
    expect(marginRate(100, 120)).toBe(-20);
  });

  it("vaut null quand le prix est nul", () => {
    expect(marginRate(0, 10)).toBeNull();
  });

  it("utilise le prix saisi (TTC) converti en HT", () => {
    const r = computePricing(tshirt, DEFAULT_SETTINGS, 60);
    expect(r.usesSuggestedPrice).toBe(false);
    expect(r.priceHt).toBe(50);
    expect(r.marginAmount).toBe(22.04);
    expect(r.marginRate).toBe(44.08);
  });

  it("utilise le prix conseillé si aucun prix n'est saisi", () => {
    const r = computePricing(tshirt, DEFAULT_SETTINGS, null);
    expect(r.usesSuggestedPrice).toBe(true);
    expect(r.priceHt).toBe(111.84);
    expect(r.priceTtc).toBe(134.21);
    expect(r.marginRate).toBe(75);
  });

  it("calcule la part du tissu dans le coût", () => {
    expect(computePricing(tshirt, DEFAULT_SETTINGS, null).fabricShare).toBe(54.36);
  });

  it("convertit TTC → HT", () => {
    expect(ttcToHt(120, 20)).toBe(100);
    expect(ttcToHt(100, 0)).toBe(100);
  });
});

describe("seuil de rentabilité", () => {
  it("arrondit au nombre de pièces supérieur", () => {
    expect(breakEven(1000, 50, 20)).toEqual({ status: "ok", units: 34, unitMargin: 30 });
  });

  it("donne un compte exact quand la division tombe juste", () => {
    expect(breakEven(3000, 50, 20)).toMatchObject({ units: 100 });
    expect(breakEven(0.3, 0.2, 0.1)).toMatchObject({ units: 3 });
  });

  it("n'est jamais atteint si chaque pièce est vendue à perte ou à prix coûtant", () => {
    expect(breakEven(1000, 20, 20)).toEqual({ status: "never", units: null, unitMargin: 0 });
    expect(breakEven(1000, 10, 20).status).toBe("never");
  });

  it("vaut 0 sans frais fixes", () => {
    expect(breakEven(0, 50, 20).status).toBe("no-fixed-costs");
  });
});

describe("utilitaires", () => {
  it("médiane", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("formate en euros à la française", () => {
    expect(formatMoney(1234.5).replace(/\s/g, " ")).toBe("1 234,50 €");
  });
});
