import { describe, expect, it } from "vitest";
import { authErrorMessage, credentialsSchema, signUpSchema } from "@/lib/validation/auth";
import { toFieldErrors } from "@/lib/validation/form";

describe("validation de l'authentification", () => {
  it("accepte des identifiants valides et normalise l'email", () => {
    const r = credentialsSchema.parse({ email: " Anna@Atelier.FR ", password: "12345678" });
    expect(r.email).toBe("anna@atelier.fr");
  });

  it("refuse un email invalide et un mot de passe trop court, en français", () => {
    const r = credentialsSchema.safeParse({ email: "anna", password: "123" });
    expect(r.success).toBe(false);
    const errors = toFieldErrors(r.error!);
    expect(errors.email).toBe("Saisis une adresse email valide.");
    expect(errors.password).toMatch(/au moins 8 caractères/);
  });

  it("vérifie que les deux mots de passe correspondent", () => {
    const r = signUpSchema.safeParse({ email: "a@b.fr", password: "12345678", confirm: "87654321" });
    expect(r.success).toBe(false);
    expect(toFieldErrors(r.error!).confirm).toMatch(/ne correspondent pas/);
  });

  it("traduit les erreurs Supabase", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Email ou mot de passe incorrect.");
    expect(authErrorMessage(undefined)).toMatch(/Réessaie/);
  });
});
