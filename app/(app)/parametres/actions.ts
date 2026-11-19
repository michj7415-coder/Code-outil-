"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/settings";
import { toFieldErrors, type FormState } from "@/lib/validation/form";

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const values = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { values, error: "Certains champs sont à corriger.", fieldErrors: toFieldErrors(parsed.error) };

  const d = parsed.data;
  const { error } = await supabase.from("settings").upsert({
    user_id: userId,
    margin_threshold: d.marginThreshold,
    vat_rate: d.vatRate,
    wholesale_coef: d.wholesaleCoef,
    retail_coef: d.retailCoef,
    currency: d.currency,
    fixed_costs: d.fixedCosts,
  });
  if (error) return { values, error: "L'enregistrement a échoué. Réessaie." };
  revalidatePath("/", "layout");
  return { values, message: "Paramètres enregistrés. Tous tes calculs utilisent désormais ces valeurs." };
}
