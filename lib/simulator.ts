/**
 * Simulateur de scénarios — fonctions pures.
 * On fait varier le prix du tissu, la main-d'œuvre et le prix de vente (en %),
 * puis on recalcule la marge et le seuil de rentabilité.
 */
import { breakEven, computePricing, round2, type BreakEven, type CostInput, type PricingResult, type PricingSettings } from "./pricing";

export type Scenario = {
  fabricPct: number; // variation du prix au mètre des tissus, en %
  laborPct: number; // variation de la main-d'œuvre, en %
  pricePct: number; // variation du prix de vente, en %
  fixedCosts: number; // frais fixes à couvrir (collection, saison…)
};

export const NEUTRAL_SCENARIO: Omit<Scenario, "fixedCosts"> = { fabricPct: 0, laborPct: 0, pricePct: 0 };

export type SimulationSide = { pricing: PricingResult; breakEven: BreakEven };

export type Simulation = {
  base: SimulationSide;
  scenario: SimulationSide;
  delta: {
    cost: number;
    priceTtc: number;
    marginAmount: number;
    /** en points de pourcentage */
    marginRate: number | null;
    /** différence de pièces à vendre (null si l'un des deux seuils est inatteignable) */
    breakEvenUnits: number | null;
  };
};

const factor = (pct: number) => Math.max(0, 1 + (Number.isFinite(pct) ? pct : 0) / 100);

export function applyScenario(input: CostInput, sc: Pick<Scenario, "fabricPct" | "laborPct">): CostInput {
  const f = factor(sc.fabricPct);
  return {
    ...input,
    materials: input.materials.map((m) => ({ ...m, pricePerMeter: m.pricePerMeter * f })),
    laborCost: input.laborCost * factor(sc.laborPct),
  };
}

export function simulate(
  input: CostInput,
  settings: PricingSettings,
  retailPriceTtc: number | null,
  sc: Scenario,
): Simulation {
  const basePricing = computePricing(input, settings, retailPriceTtc);
  // Le prix simulé part du prix retenu (saisi ou conseillé) et reste fixe :
  // il ne suit pas automatiquement la hausse des coûts.
  const simPrice = round2(basePricing.priceTtc * factor(sc.pricePct));
  const simPricing = computePricing(applyScenario(input, sc), settings, simPrice > 0 ? simPrice : 0.01);
  const fixed = Math.max(0, sc.fixedCosts || 0);

  const base = { pricing: basePricing, breakEven: breakEven(fixed, basePricing.priceHt, basePricing.cost.total) };
  const scenario = { pricing: simPricing, breakEven: breakEven(fixed, simPricing.priceHt, simPricing.cost.total) };

  return {
    base,
    scenario,
    delta: {
      cost: round2(simPricing.cost.total - basePricing.cost.total),
      priceTtc: round2(simPricing.priceTtc - basePricing.priceTtc),
      marginAmount: round2(simPricing.marginAmount - basePricing.marginAmount),
      marginRate:
        simPricing.marginRate != null && basePricing.marginRate != null
          ? round2(simPricing.marginRate - basePricing.marginRate)
          : null,
      breakEvenUnits:
        base.breakEven.units != null && scenario.breakEven.units != null
          ? scenario.breakEven.units - base.breakEven.units
          : null,
    },
  };
}
