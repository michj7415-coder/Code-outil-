import { describe, expect, it } from "vitest";
import { costSegments } from "@/lib/cost-breakdown";
import { computeCost } from "@/lib/pricing";

describe("répartition des coûts (graphique en anneau)", () => {
  it("donne les parts de chaque poste, sans les postes à zéro", () => {
    const s = costSegments(
      computeCost({
        materials: [{ name: "Coton", pricePerMeter: 10, metersUsed: 1.5 }], // 15
        accessories: [{ name: "Bouton", unitPrice: 0.5, quantity: 2 }], // 1
        laborCost: 24,
        extraCosts: [],
      }),
    );
    expect(s.map((x) => [x.key, x.value, x.share])).toEqual([
      ["materials", 15, 37.5],
      ["labor", 24, 60],
      ["accessories", 1, 2.5],
    ]);
  });

  it("totalise toujours 100 %", () => {
    const s = costSegments(
      computeCost({
        materials: [{ name: "a", pricePerMeter: 1, metersUsed: 1 }],
        accessories: [{ name: "b", unitPrice: 1, quantity: 1 }],
        laborCost: 1,
        extraCosts: [],
      }),
    );
    expect(s.reduce((t, x) => t + x.share, 0)).toBeCloseTo(100, 10);
  });

  it("est vide quand le coût est nul", () => {
    expect(costSegments(computeCost({ materials: [], accessories: [], laborCost: 0, extraCosts: [] }))).toEqual([]);
  });
});
