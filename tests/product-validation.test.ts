import { describe, expect, it } from "vitest";
import { productSchema, techSheetSchema, validatePhoto } from "@/lib/validation/product";
import { toFieldErrors } from "@/lib/validation/form";

const base = {
  name: "Sweat Lou",
  category: "sweat",
  laborCost: "15",
  retailPriceTtc: "",
  materials: [{ name: "Molleton", pricePerMeter: "14,50", metersUsed: "1,4" }],
  accessories: [],
  extraCosts: [{ label: "Transport", kind: "amount", value: "2" }],
};

describe("validation du produit", () => {
  it("convertit les saisies françaises (virgule, vide)", () => {
    const r = productSchema.parse(base);
    expect(r.materials[0]).toEqual({ name: "Molleton", pricePerMeter: 14.5, metersUsed: 1.4 });
    expect(r.laborCost).toBe(15);
    expect(r.retailPriceTtc).toBeNull();
  });

  it("donne des messages clairs, rattachés au bon champ", () => {
    const r = productSchema.safeParse({
      ...base,
      name: "  ",
      category: "chaussure",
      laborCost: "-3",
      materials: [{ name: "", pricePerMeter: "abc", metersUsed: "1" }],
      extraCosts: [{ label: "Chutes", kind: "percent", value: "900" }],
    });
    expect(r.success).toBe(false);
    const e = toFieldErrors(r.error!);
    expect(e.name).toBe("Donne un nom au produit.");
    expect(e.category).toBe("Choisis une catégorie.");
    expect(e.laborCost).toBe("La main-d'œuvre : saisis une valeur positive ou nulle.");
    expect(e["materials.0.name"]).toBe("Donne un nom au tissu.");
    expect(e["materials.0.pricePerMeter"]).toBe("Le prix au mètre : saisis un nombre.");
    expect(e["extraCosts.0.value"]).toMatch(/500 %/);
  });

  it("valide le tableau de mesures", () => {
    const ok = techSheetSchema.safeParse({
      suppliers: "",
      workshopNotes: "",
      sizes: [{ measureLabel: "Tour de poitrine", xs: "84", s: "88", m: "92", l: "", xl: "" }],
    });
    expect(ok.success).toBe(true);
    const ko = techSheetSchema.safeParse({ suppliers: "", workshopNotes: "", sizes: [{ measureLabel: "", xs: "", s: "", m: "", l: "", xl: "" }] });
    expect(toFieldErrors(ko.error!)["sizes.0.measureLabel"]).toMatch(/Nomme la mesure/);
  });

  it("contrôle le format et le poids de la photo", () => {
    expect(validatePhoto(null)).toBeNull();
    expect(validatePhoto(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPG, PNG ou WebP/);
    expect(validatePhoto(new File([new Uint8Array(6 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }))).toMatch(/5 Mo/);
    expect(validatePhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBeNull();
  });
});
