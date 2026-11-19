import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type CostInput } from "@/lib/pricing";
import { applyScenario, simulate } from "@/lib/simulator";

// coût 25 € (tissu 10 €, main-d'œuvre 15 €), vendu 60 € TTC = 50 € HT
const input: CostInput = {
  materials: [{ name: "Coton", pricePerMeter: 10, metersUsed: 1 }],
  accessories: [],
  laborCost: 15,
  extraCosts: [{ label: "Chutes", kind: "percent", value: 0 }],
};

describe("simulateur", () => {
  it("sans variation, le scénario est identique à la situation actuelle", () => {
    const s = simulate(input, DEFAULT_SETTINGS, 60, { fabricPct: 0, laborPct: 0, pricePct: 0, fixedCosts: 1000 });
    expect(s.scenario.pricing.cost.total).toBe(25);
    expect(s.scenario.pricing.marginRate).toBe(50);
    expect(s.delta).toEqual({ cost: 0, priceTtc: 0, marginAmount: 0, marginRate: 0, breakEvenUnits: 0 });
    expect(s.base.breakEven).toEqual({ status: "ok", units: 40, unitMargin: 25 });
  });

  it("tissu +20 % : le coût monte de 2 €, la marge baisse", () => {
    const s = simulate(input, DEFAULT_SETTINGS, 60, { fabricPct: 20, laborPct: 0, pricePct: 0, fixedCosts: 1000 });
    expect(s.scenario.pricing.cost.total).toBe(27);
    expect(s.scenario.pricing.marginRate).toBe(46);
    expect(s.delta.marginRate).toBe(-4);
    expect(s.scenario.breakEven.units).toBe(44); // 1000 / 23 = 43,5 → 44
    expect(s.delta.breakEvenUnits).toBe(4);
  });

  it("main-d'œuvre −20 % : le coût baisse de 3 €", () => {
    const s = simulate(input, DEFAULT_SETTINGS, 60, { fabricPct: 0, laborPct: -20, pricePct: 0, fixedCosts: 0 });
    expect(s.scenario.pricing.cost.total).toBe(22);
    expect(s.delta.cost).toBe(-3);
  });

  it("prix de vente +10 % : 66 € TTC, marge et seuil améliorés", () => {
    const s = simulate(input, DEFAULT_SETTINGS, 60, { fabricPct: 0, laborPct: 0, pricePct: 10, fixedCosts: 1000 });
    expect(s.scenario.pricing.priceTtc).toBe(66);
    expect(s.scenario.pricing.priceHt).toBe(55);
    expect(s.scenario.breakEven.units).toBe(34); // 1000 / 30 = 33,3 → 34
  });

  it("part du prix conseillé quand aucun prix n'est saisi, sans le recalculer", () => {
    const s = simulate(input, DEFAULT_SETTINGS, null, { fabricPct: 100, laborPct: 0, pricePct: 0, fixedCosts: 0 });
    expect(s.base.pricing.priceTtc).toBe(120);
    expect(s.scenario.pricing.priceTtc).toBe(120);
    expect(s.scenario.pricing.cost.total).toBe(35);
  });

  it("seuil inatteignable si le scénario fait vendre à perte", () => {
    const s = simulate(input, DEFAULT_SETTINGS, 60, { fabricPct: 0, laborPct: 0, pricePct: -50, fixedCosts: 1000 });
    expect(s.scenario.breakEven.status).toBe("never");
    expect(s.delta.breakEvenUnits).toBeNull();
  });

  it("une baisse de plus de 100 % est plafonnée à zéro", () => {
    expect(applyScenario(input, { fabricPct: -150, laborPct: 0 }).materials[0].pricePerMeter).toBe(0);
  });
});
