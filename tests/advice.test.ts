import { describe, expect, it } from "vitest";
import { ADVICE_DISCLAIMER, buildAdvice, type AdviceContext } from "@/lib/advice";
import { computePricing, DEFAULT_SETTINGS, type CostInput } from "@/lib/pricing";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

function ctx(input: CostInput, price: number | null, extra: Partial<AdviceContext> = {}): AdviceContext {
  return {
    pricing: computePricing(input, DEFAULT_SETTINGS, price),
    settings: DEFAULT_SETTINGS,
    currency: "EUR",
    category: "tshirt",
    categoryLabel: "T-shirt",
    productId: "p0",
    peers: [],
    ...extra,
  };
}

// coût 25 € : tissu 10 €, main-d'œuvre 15 € → tissu 40 %
const balanced: CostInput = {
  materials: [{ name: "Coton", pricePerMeter: 10, metersUsed: 1 }],
  accessories: [],
  laborCost: 15,
  extraCosts: [],
};
// coût 20 € : tissu 15 € → 75 %
const fabricHeavy: CostInput = {
  materials: [{ name: "Laine", pricePerMeter: 30, metersUsed: 0.5 }],
  accessories: [],
  laborCost: 5,
  extraCosts: [],
};

const find = (list: ReturnType<typeof buildAdvice>, id: string) => list.find((a) => a.id === id);

describe("conseils sur les prix", () => {
  it("explique le prix conseillé étape par étape", () => {
    const a = find(buildAdvice(ctx(balanced, 120)), "prix-conseille")!;
    expect(nbsp(a.title)).toBe("Prix public conseillé : 120,00 € TTC");
    expect(nbsp(a.why)).toContain("Multiplié par 2 (coefficient de gros)");
    expect(nbsp(a.why)).toContain("prix de gros de 50,00 € HT");
    expect(nbsp(a.why)).toContain("100,00 € HT");
    expect(nbsp(a.why)).toContain("20 % de TVA");
    expect(a.action).toMatch(/ajuste/);
  });

  it("alerte quand la marge est sous le seuil et chiffre le prix minimum", () => {
    // 48 € TTC = 40 € HT ; coût 25 € → marge 37,5 %
    const a = find(buildAdvice(ctx(balanced, 48)), "marge")!;
    expect(a.tone).toBe("warn");
    expect(nbsp(a.title)).toBe("Marge de 38 %, sous ton seuil de 50 %");
    // 50 % de marge → prix HT minimum 50 € → 60 € TTC ; coût max 20 €
    expect(nbsp(a.why)).toContain("il te reste 15,00 € par pièce");
    expect(nbsp(a.action)).toContain("au moins 60,00 € TTC");
    expect(nbsp(a.action)).toContain("20,00 € maximum");
  });

  it("signale clairement une vente à perte", () => {
    const a = find(buildAdvice(ctx(balanced, 24)), "marge")!; // 20 € HT < 25 €
    expect(nbsp(a.title)).toBe("Tu vends à perte : 5,00 € perdus par pièce");
  });

  it("confirme une marge suffisante", () => {
    const a = find(buildAdvice(ctx(balanced, 120)), "marge")!;
    expect(a.tone).toBe("ok");
  });

  it("respecte le seuil personnalisé", () => {
    const c = ctx(balanced, 48, { settings: { ...DEFAULT_SETTINGS, marginThreshold: 30 } });
    expect(find(buildAdvice(c), "marge")!.tone).toBe("ok");
  });

  it("alerte quand le tissu dépasse 50 % du coût", () => {
    const a = find(buildAdvice(ctx(fabricHeavy, 80)), "tissu")!;
    expect(nbsp(a.title)).toBe("Ton tissu représente 75 % du coût");
    expect(nbsp(a.why)).toContain("1,50 €");
    expect(a.action).toMatch(/fournisseurs/);
    expect(find(buildAdvice(ctx(balanced, 80)), "tissu")).toBeUndefined();
  });

  it("compare au prix médian des autres produits de la catégorie", () => {
    const peers = [
      { id: "a", category: "tshirt", priceTtc: 40 },
      { id: "b", category: "tshirt", priceTtc: 45 },
      { id: "c", category: "tshirt", priceTtc: 50 },
      { id: "d", category: "robe", priceTtc: 300 }, // autre catégorie : ignorée
      { id: "p0", category: "tshirt", priceTtc: 999 }, // le produit lui-même : ignoré
    ];
    const a = find(buildAdvice(ctx(balanced, 120, { peers })), "categorie")!;
    expect(nbsp(a.title)).toBe("Prix 167 % au-dessus de tes autres produits « t-shirt »");
    expect(nbsp(a.why)).toContain("Tes 3 autres produits");
    expect(nbsp(a.why)).toContain("45,00 € TTC");
    expect(nbsp(a.action)).toContain("rapproche ton prix de 45,00 €");

    const cheap = find(buildAdvice(ctx(balanced, 20, { peers })), "categorie")!;
    expect(cheap.title).toContain("en dessous");

    expect(find(buildAdvice(ctx(balanced, 55, { peers })), "categorie")).toBeUndefined();
  });

  it("ne compare pas avec moins de 2 autres produits", () => {
    const peers = [{ id: "a", category: "tshirt", priceTtc: 30 }];
    expect(find(buildAdvice(ctx(balanced, 120, { peers })), "categorie")).toBeUndefined();
  });

  it("indique quand la marge est calculée sur le prix conseillé", () => {
    expect(find(buildAdvice(ctx(balanced, null)), "prix-absent")).toBeDefined();
    expect(find(buildAdvice(ctx(balanced, 60)), "prix-absent")).toBeUndefined();
  });

  it("invite à saisir les coûts quand le produit est vide", () => {
    const list = buildAdvice(ctx({ materials: [], accessories: [], laborCost: 0, extraCosts: [] }, null));
    expect(list).toHaveLength(1);
    expect(list[0].title).toMatch(/Saisis tes coûts/);
  });

  it("chaque conseil a un constat, un pourquoi et un que faire", () => {
    for (const a of buildAdvice(ctx(fabricHeavy, 20, { peers: [{ id: "a", category: "tshirt", priceTtc: 90 }, { id: "b", category: "tshirt", priceTtc: 95 }] }))) {
      expect(a.title.length).toBeGreaterThan(5);
      expect(a.why.length).toBeGreaterThan(20);
      expect(a.action.length).toBeGreaterThan(20);
    }
  });

  it("présente les conseils comme des repères", () => {
    expect(ADVICE_DISCLAIMER).toMatch(/repères/);
    expect(ADVICE_DISCLAIMER).toMatch(/pas des vérités/);
  });
});
