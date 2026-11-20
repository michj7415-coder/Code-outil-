import { describe, expect, it } from "vitest";
import { feedbackSchema } from "@/lib/validation/feedback";
import { toFieldErrors } from "@/lib/validation/form";

describe("validation de l'avis", () => {
  it("accepte une note de 1 à 5 et une réponse facultative", () => {
    expect(feedbackSchema.parse({ rating: "4", message: "  Super  ", page: "/produits" })).toEqual({ rating: 4, message: "Super", page: "/produits" });
    expect(feedbackSchema.parse({ rating: 1 })).toEqual({ rating: 1, message: "", page: "" });
  });

  it("exige une note entre 1 et 5", () => {
    for (const rating of [undefined, "", "0", "6", "2.5", "abc"]) {
      const r = feedbackSchema.safeParse({ rating });
      expect(r.success).toBe(false);
      expect(toFieldErrors(r.error!).rating).toBe("Choisis une note de 1 à 5.");
    }
  });

  it("limite la réponse à 2000 caractères", () => {
    const r = feedbackSchema.safeParse({ rating: 3, message: "x".repeat(2001) });
    expect(toFieldErrors(r.error!).message).toMatch(/2000/);
  });
});
