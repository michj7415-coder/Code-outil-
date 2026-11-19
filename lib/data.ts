import "server-only";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, type CostInput } from "./pricing";
import type { Category } from "./validation/product";

export const PHOTO_BUCKET = "product-photos";

export type Settings = {
  marginThreshold: number;
  vatRate: number;
  wholesaleCoef: number;
  retailCoef: number;
  currency: string;
  fixedCosts: number;
};

export type SizeRow = { measureLabel: string; xs: string; s: string; m: string; l: string; xl: string };

export type Product = CostInput & {
  id: string;
  name: string;
  category: Category;
  photoPath: string | null;
  retailPriceTtc: number | null;
  suppliers: string;
  workshopNotes: string;
  sizes: SizeRow[];
  updatedAt: string;
};

type Row = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const byPosition = (a: Row, b: Row) => num(a.position) - num(b.position);

function mapProduct(r: Row): Product {
  const rows = (k: string) => ((r[k] as Row[] | null) ?? []).slice().sort(byPosition);
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as Category,
    photoPath: (r.photo_path as string | null) ?? null,
    laborCost: num(r.labor_cost),
    retailPriceTtc: r.retail_price_ttc == null ? null : Number(r.retail_price_ttc),
    suppliers: (r.suppliers as string) ?? "",
    workshopNotes: (r.workshop_notes as string) ?? "",
    updatedAt: r.updated_at as string,
    materials: rows("product_materials").map((m) => ({
      name: m.name as string,
      pricePerMeter: num(m.price_per_meter),
      metersUsed: num(m.meters_used),
    })),
    accessories: rows("product_accessories").map((a) => ({
      name: a.name as string,
      unitPrice: num(a.unit_price),
      quantity: num(a.quantity),
    })),
    extraCosts: rows("product_extra_costs").map((e) => ({
      label: e.label as string,
      kind: e.kind as "amount" | "percent",
      value: num(e.value),
    })),
    sizes: rows("product_sizes").map((s) => ({
      measureLabel: s.measure_label as string,
      xs: s.xs as string,
      s: s.s as string,
      m: s.m as string,
      l: s.l as string,
      xl: s.xl as string,
    })),
  };
}

const PRODUCT_SELECT =
  "*, product_materials(*), product_accessories(*), product_extra_costs(*), product_sizes(*)";

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Impossible de charger les paramètres : ${error.message}`);
  if (!data) {
    // Filet de sécurité si le trigger d'inscription n'a pas créé la ligne.
    await supabase.from("settings").upsert({ user_id: userId });
    return { ...DEFAULT_SETTINGS };
  }
  return {
    marginThreshold: num(data.margin_threshold),
    vatRate: num(data.vat_rate),
    wholesaleCoef: num(data.wholesale_coef),
    retailCoef: num(data.retail_coef),
    currency: data.currency,
    fixedCosts: num(data.fixed_costs),
  };
}

export async function listProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Impossible de charger les produits : ${error.message}`);
  return (data ?? []).map(mapProduct);
}

export async function getProduct(supabase: SupabaseClient, id: string): Promise<Product> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Impossible de charger le produit : ${error.message}`);
  if (!data) notFound();
  return mapProduct(data);
}

/** URLs signées (1 h) pour afficher des photos d'un bucket privé. */
export async function signedPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
