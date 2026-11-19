import { z } from "zod";

export const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollar américain ($)" },
  { value: "GBP", label: "Livre sterling (£)" },
  { value: "CHF", label: "Franc suisse (CHF)" },
  { value: "CAD", label: "Dollar canadien ($ CA)" },
] as const;

const decimal = (label: string, min: number, max: number, minInclusive = true) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? NaN : Number(v.replace(",", ".").replace(/\s/g, ""))) : v),
    z
      .number({ error: `${label} : saisis un nombre.` })
      .refine(Number.isFinite, { error: `${label} : saisis un nombre.` })
      .refine((n) => (minInclusive ? n >= min : n > min), {
        error: minInclusive ? `${label} : la valeur minimale est ${min}.` : `${label} : saisis une valeur supérieure à ${min}.`,
      })
      .refine((n) => n <= max, { error: `${label} : la valeur maximale est ${max.toLocaleString("fr-FR")}.` }),
  );

export const settingsSchema = z.object({
  marginThreshold: decimal("Le seuil de marge", 0, 99),
  vatRate: decimal("La TVA", 0, 100),
  wholesaleCoef: decimal("Le coefficient de gros", 0, 20, false),
  retailCoef: decimal("Le coefficient de détail", 0, 20, false),
  currency: z.enum(CURRENCIES.map((c) => c.value) as [string, ...string[]], { error: "Choisis une devise." }),
  fixedCosts: decimal("Les frais fixes", 0, 100_000_000),
});

export type SettingsData = z.output<typeof settingsSchema>;
