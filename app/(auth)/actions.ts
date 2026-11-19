"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  redirect("/produits");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = keepEmail(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${site}/auth/callback` },
  });
  if (error) return { values, error: authErrorMessage(error.code, error.message) };

  // Confirmation d'email désactivée dans Supabase : la session est déjà ouverte.
  if (data.session) redirect("/produits");
  return { message: "Compte créé. Ouvre l'email de confirmation que nous venons d'envoyer pour activer ton compte." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
