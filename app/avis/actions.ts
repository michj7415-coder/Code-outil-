"use server";

import { requireUser } from "@/lib/supabase/server";
import { describeDbError } from "@/lib/setup-check";
import { feedbackSchema } from "@/lib/validation/feedback";
import { toFieldErrors, type FormState } from "@/lib/validation/form";

export async function submitFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const parsed = feedbackSchema.safeParse({
    rating: formData.get("rating") ?? undefined,
    message: String(formData.get("message") ?? ""),
    page: String(formData.get("page") ?? "").slice(0, 200),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { error } = await supabase.from("feedback").insert(parsed.data);
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return {
      error: missing
        ? "L'envoi d'avis n'est pas encore activé : exécute le fichier 0004_feedback.sql dans Supabase."
        : `L'envoi a échoué. ${describeDbError(error)}`,
    };
  }
  return { message: "Merci ! Ton avis a bien été envoyé." };
}
