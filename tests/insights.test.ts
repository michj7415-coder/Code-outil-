import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/data";
import { buildDashboard, computeCompletion, marginLevel } from "@/lib/insights";
import { DEFAULT_SETTINGS } from "@/lib/pricing";

function product(over: Partial<Product> = {}): Product {
  return {
    id: over.id ?? "p1",
    name: "Tee",
    category: "tshirt",
    photoPath: "u/p.jpg",
    laborCost: 15,
    retailPriceTtc: 60, // 50 € HT
    suppliers: "",
    workshopNotes: "Surpiqûre 3 mm",
    updatedAt: "",
    materials: [{ name: "Coton", pricePerMeter: 10, metersUsed: 1 }], // coût 25 € → marge 50 %
    accessories: [],
    extraCosts: [],
    sizes: [{ measureLabel: "Poitrine", xs: "", s: "", m: "52", l: "", xl: "" }],
    ...over,
  };
}

describe("code couleur de la marge", () => {
  it("vert au-dessus du seuil, orange jusqu'à 10 points dessous, rouge au-delà", () => {
    expect(marginLevel(50, 50)).toBe("ok");
    expect(marginLevel(72, 50)).toBe("ok");
    expect(marginLevel(49.9, 50)).toBe("warn");
    expect(marginLevel(40, 50)).toBe("warn");
    expect(marginLevel(39.9, 50)).toBe("bad");
    expect(marginLevel(-5, 50)).toBe("bad");
    expect(marginLevel(null, 50)).toBe("none");
  });

  it("une vente à perte est toujours rouge, même avec un seuil bas", () => {
    expect(marginLevel(-1, 5)).toBe("bad");
  });
});

describe("complétion d'une fiche", () => {
  it("vaut 100 % quand les 7 points sont remplis", () => {
    const c = computeCompletion(product());
    expect(c.percent).toBe(100);
    expect(c.missing).toEqual([]);
  });

  it("liste ce qui manque, dans l'ordre", () => {
    const c = computeCompletion(product({ photoPath: null, sizes: [], workshopNotes: " ", retailPriceTtc: null }));
    expect(c.done).toBe(3);
    expect(c.percent).toBe(43);
    expect(c.missing.map((m) => m.label)).toEqual(["photo", "prix de vente", "tableau de mesures", "consignes atelier"]);
  });

  it("un tissu sans métrage ou une ligne de mesures vide ne comptent pas", () => {
    const c = computeCompletion(
      product({
        materials: [{ name: "Coton", pricePerMeter: 10, metersUsed: 0 }],
        sizes: [{ measureLabel: "Poitrine", xs: "", s: "", m: "", l: "", xl: "" }],
      }),
    );
    expect(c.missing.map((m) => m.key)).toEqual(["tissu", "mesures"]);
  });
});

describe("tableau de bord", () => {
  const products = [
    product({ id: "a", name: "Tee OK" }), // 50 % → vert
    product({ id: "b", name: "Sweat orange", retailPriceTtc: 50 }), // 41,67 € HT → 40 % → orange
    product({ id: "c", name: "Robe perte", retailPriceTtc: 24 }), // 20 € HT → -25 % → rouge
    product({ id: "d", name: "Veste incomplète", photoPath: null, sizes: [] }), // 50 %, incomplète
  ];
  const d = buildDashboard(products, DEFAULT_SETTINGS);

  it("compte les produits, la marge moyenne et les alertes", () => {
    expect(d.count).toBe(4);
    expect(d.averageMargin).toBe(28.75); // (50 + 40 − 25 + 50) / 4
    expect(d.averageLevel).toBe("bad");
    expect(d.alertCount).toBe(2);
    expect(d.completeCount).toBe(3);
  });

  it("met les marges les plus basses en tête, puis les fiches incomplètes", () => {
    expect(d.todos.map((t) => `${t.kind}:${t.productId}`)).toEqual(["marge:c", "marge:b", "incomplet:d"]);
    expect(d.todos[0].text).toMatch(/vendu à perte/);
    expect(d.todos[0].level).toBe("bad");
    expect(d.todos[1].text.replace(/ | /g, " ")).toBe("marge 40 %, sous ton seuil de 50 %");
    expect(d.todos[2].text).toBe("il manque : photo, tableau de mesures");
    expect(d.todos[2].href).toBe("/produits/d"); // la photo se complète dans l'onglet Coûts
  });

  it("renvoie vers la fiche technique quand seuls les mesures ou consignes manquent", () => {
    const only = buildDashboard([product({ id: "e", workshopNotes: "" })], DEFAULT_SETTINGS);
    expect(only.todos[0].href).toBe("/produits/e/fiche-technique");
  });

  it("gère l'absence de produits", () => {
    const empty = buildDashboard([], DEFAULT_SETTINGS);
    expect(empty).toMatchObject({ count: 0, averageMargin: null, averageLevel: "none", alertCount: 0, todos: [] });
  });
});
