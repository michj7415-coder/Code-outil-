import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "./data";

export type SetupProblem = { title: string; steps: string[]; technical: string };

type DbError = { code?: string; message?: string } | null | undefined;

const isMissingTable = (e: DbError) =>
  e?.code === "PGRST205" || e?.code === "42P01" || /could not find the table|does not exist/i.test(e?.message ?? "");
const isMissingFunction = (e: DbError) =>
  e?.code === "PGRST202" || e?.code === "42883" || /could not find the function/i.test(e?.message ?? "");

const RUN_0001 = "Dans Supabase, ouvre SQL Editor → New query, colle tout le fichier supabase/migrations/0001_init.sql puis Run.";
const RUN_0002 =
  "Puis, dans une nouvelle requête, exécute de la même façon supabase/migrations/0002_product_functions.sql, puis 0003_grants.sql.";

/** Explique en français une erreur de base de données renvoyée par Supabase. */
export function describeDbError(e: DbError): string {
  if (isMissingTable(e)) return "La base n'est pas initialisée : exécute le fichier SQL 0001_init.sql dans Supabase.";
  if (isMissingFunction(e)) return "Il manque les fonctions SQL : exécute le fichier 0002_product_functions.sql dans Supabase.";
  if (e?.code === "42501") return "Accès refusé : exécute le fichier 0003_grants.sql dans Supabase.";
  return `Erreur de la base de données${e?.code ? ` (${e.code})` : ""} : ${e?.message ?? "inconnue"}`;
}

/**
 * Vérifie que les migrations ont bien été appliquées. Renvoie null si tout va bien,
 * sinon un problème expliqué pas à pas (affiché à la place de l'application).
 */
export async function checkSetup(supabase: SupabaseClient, userId: string): Promise<SetupProblem | null> {
  const [settings, products, fn, bucket] = await Promise.all([
    supabase.from("settings").select("user_id").limit(1),
    supabase.from("products").select("id").limit(1),
    // Avec un id inexistant, la fonction répond « Produit introuvable » : elle existe donc.
    supabase.rpc("duplicate_product", { p_id: "00000000-0000-0000-0000-000000000000", p_photo_path: null }),
    supabase.storage.from(PHOTO_BUCKET).list(userId, { limit: 1 }),
  ]);

  if (isMissingTable(settings.error) || isMissingTable(products.error)) {
    return {
      title: "La base de données n'est pas encore créée",
      steps: [RUN_0001, RUN_0002, "Reviens ici et recharge la page."],
      technical: `${(settings.error ?? products.error)?.code ?? ""} ${(settings.error ?? products.error)?.message ?? ""}`,
    };
  }
  const denied = [settings.error, products.error].find((e) => e?.code === "42501");
  if (denied) {
    return {
      title: "Les tables existent, mais l'application n'a pas le droit d'y accéder",
      steps: [
        "Dans Supabase, ouvre SQL Editor → New query.",
        "Colle tout le fichier supabase/migrations/0003_grants.sql puis Run.",
        "Reviens ici et recharge la page.",
      ],
      technical: `${denied.code} ${denied.message}`,
    };
  }
  if (settings.error || products.error) {
    const e = settings.error ?? products.error;
    return {
      title: "La base de données répond avec une erreur",
      steps: [
        "Vérifie que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY correspondent bien au même projet Supabase.",
        "Si le fichier 0001_init.sql s'est arrêté sur une erreur, exécute-le à nouveau dans un projet vide.",
      ],
      technical: `${e?.code ?? ""} ${e?.message ?? ""}`,
    };
  }
  if (isMissingFunction(fn.error)) {
    return {
      title: "Il manque une partie de la base de données",
      steps: [
        "Les tables existent, mais pas les fonctions d'enregistrement.",
        "Dans Supabase, ouvre SQL Editor → New query, colle tout le fichier supabase/migrations/0002_product_functions.sql puis Run.",
        "Reviens ici et recharge la page.",
      ],
      technical: `${fn.error?.code ?? ""} ${fn.error?.message ?? ""}`,
    };
  }
  if (bucket.error && /bucket not found/i.test(bucket.error.message)) {
    return {
      title: "Le stockage des photos n'est pas créé",
      steps: [
        "La fin du fichier 0001_init.sql (partie « Stockage des photos ») n'a pas été exécutée.",
        "Dans SQL Editor, colle et exécute uniquement cette dernière partie du fichier, puis recharge la page.",
      ],
      technical: bucket.error.message,
    };
  }
  return null;
}
