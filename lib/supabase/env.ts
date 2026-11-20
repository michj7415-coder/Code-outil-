/** Retire les espaces et les « / » finaux souvent collés par erreur. */
export function cleanUrl(value: string | undefined): string | undefined {
  const v = value?.trim().replace(/\/+$/, "");
  return v ? v : undefined;
}

/** URL publique de l'application, sans « / » final. */
export function siteUrl(): string {
  return cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000";
}

export function supabaseEnv() {
  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Variables Supabase manquantes : copiez .env.example vers .env.local et renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}
