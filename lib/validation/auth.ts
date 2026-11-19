import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string({ error: "Saisis ton adresse email." })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Saisis une adresse email valide." })),
  password: z
    .string({ error: "Saisis ton mot de passe." })
    .min(8, { error: "Le mot de passe doit contenir au moins 8 caractères." })
    .max(72, { error: "Le mot de passe ne peut pas dépasser 72 caractères." }),
});

export const signUpSchema = credentialsSchema
  .extend({ confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas.",
  });

/** Traduit les erreurs Supabase Auth les plus courantes. */
export function authErrorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Ton adresse email n'est pas encore confirmée. Clique sur le lien reçu par email.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse. Connecte-toi plutôt.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisis-en un plus long ou plus varié.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
    default:
      return fallback ? `Une erreur est survenue : ${fallback}` : "Une erreur est survenue. Réessaie.";
  }
}
