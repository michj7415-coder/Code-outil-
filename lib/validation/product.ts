import { z } from "zod";

export const CATEGORIES = [
  { value: "tshirt", label: "T-shirt" },
  { value: "sweat", label: "Sweat" },
  { value: "veste", label: "Veste" },
  { value: "robe", label: "Robe" },
  { value: "pantalon", label: "Pantalon" },
  { value: "autre", label: "Autre" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Autre";
}

/** Nombre saisi dans un champ texte : accepte « 12,50 », vide = 0. */
const amount = (label: string, max = 1_000_000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? 0 : Number(v.replace(",", ".").replace(/\s/g, ""))) : v),
    z
      .number({ error: `${label} : saisis un nombre.` })
      .refine(Number.isFinite, { error: `${label} : saisis un nombre.` })
      .min(0, { error: `${label} : saisis une valeur positive ou nulle.` })
      .max(max, { error: `${label} : valeur trop grande.` }),
  );

const optionalAmount = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    amount(label).nullable(),
  );

const lineName = (label: string) =>
  z.string().trim().min(1, { error: `Donne un nom ${label}.` }).max(120, { error: "120 caractères maximum." });

export const materialSchema = z.object({
  name: lineName("au tissu"),
  pricePerMeter: amount("Le prix au mètre"),
  metersUsed: amount("Le métrage", 1000),
});

export const accessorySchema = z.object({
  name: lineName("à l'accessoire"),
  unitPrice: amount("Le prix unitaire"),
  quantity: amount("La quantité", 10_000),
});

export const extraCostSchema = z
  .object({
    label: lineName("au frais"),
    kind: z.enum(["amount", "percent"], { error: "Choisis € ou %." }),
    value: amount("Le montant"),
  })
  .refine((e) => e.kind !== "percent" || e.value <= 500, {
    path: ["value"],
    error: "Un pourcentage ne peut pas dépasser 500 %.",
  });

export const productSchema = z.object({
  name: z
    .string({ error: "Donne un nom au produit." })
    .trim()
    .min(1, { error: "Donne un nom au produit." })
    .max(120, { error: "120 caractères maximum." }),
  category: z.enum(CATEGORIES.map((c) => c.value) as [Category, ...Category[]], {
    error: "Choisis une catégorie.",
  }),
  laborCost: amount("La main-d'œuvre"),
  retailPriceTtc: optionalAmount("Le prix de vente"),
  materials: z.array(materialSchema).max(50),
  accessories: z.array(accessorySchema).max(100),
  extraCosts: z.array(extraCostSchema).max(30),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

const sizeCell = z.string().trim().max(30, { error: "30 caractères maximum." });

export const techSheetSchema = z.object({
  suppliers: z.string().max(4000, { error: "4000 caractères maximum." }),
  workshopNotes: z.string().max(8000, { error: "8000 caractères maximum." }),
  sizes: z
    .array(
      z.object({
        measureLabel: z.string().trim().min(1, { error: "Nomme la mesure (ex. tour de poitrine)." }).max(80),
        xs: sizeCell,
        s: sizeCell,
        m: sizeCell,
        l: sizeCell,
        xl: sizeCell,
      }),
    )
    .max(40),
});

export type TechSheetData = z.output<typeof techSheetSchema>;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function validatePhoto(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!PHOTO_TYPES.includes(file.type)) return "La photo doit être au format JPG, PNG ou WebP.";
  if (file.size > PHOTO_MAX_BYTES) return "La photo ne doit pas dépasser 5 Mo.";
  return null;
}
