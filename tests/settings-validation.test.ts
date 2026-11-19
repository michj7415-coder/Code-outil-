import { describe, expect, it } from "vitest";
import { settingsSchema } from "@/lib/validation/settings";
import { toFieldErrors } from "@/lib/validation/form";

describe("validation des paramètres", () => {
  it("accepte les valeurs par défaut saisies à la française", () => {
    expect(
      settingsSchema.parse({ marginThreshold: "50", vatRate: "5,5", wholesaleCoef: "2,2", retailCoef: "2", currency: "EUR", fixedCosts: "1 500" }),
    ).toEqual({ marginThreshold: 50, vatRate: 5.5, wholesaleCoef: 2.2, retailCoef: 2, currency: "EUR", fixedCosts: 1500 });
  });

  it("refuse les valeurs absurdes avec des messages clairs", () => {
    const r = settingsSchema.safeParse({ marginThreshold: "120", vatRate: "", wholesaleCoef: "0", retailCoef: "-1", currency: "XYZ", fixedCosts: "-5" });
    const e = toFieldErrors(r.error!);
    expect(e.marginThreshold).toBe("Le seuil de marge : la valeur maximale est 99.");
    expect(e.vatRate).toBe("La TVA : saisis un nombre.");
    expect(e.wholesaleCoef).toBe("Le coefficient de gros : saisis une valeur supérieure à 0.");
    expect(e.retailCoef).toBe("Le coefficient de détail : saisis une valeur supérieure à 0.");
    expect(e.currency).toBe("Choisis une devise.");
    expect(e.fixedCosts).toBe("Les frais fixes : la valeur minimale est 0.");
  });
});
