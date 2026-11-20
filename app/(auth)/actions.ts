"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import { authErrorMessage, credentialsSchema, signUpSchema } from "@/lib/validation/auth";
import { toFieldErrors, type FormState } from "@/lib/validation/form";

function keepEmail(formData: FormData) {
  return { email: String(formData.get("email") ?? "") };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = keepEmail(formData);
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { values, error: authErrorMessage(error.code, error.message) };
  redirect("/tableau-de-bord");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = keepEmail(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) return { values, error: authErrorMessage(error.code, error.message) };

  // Confirmation d'email désactivée dans Supabase : la session est déjà ouverte.
  if (data.session) redirect("/tableau-de-bord");
  return { message: "Compte créé. Ouvre l'email de confirmation que nous venons d'envoyer pour activer ton compte." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
