import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const { erreur } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Connexion</h1>
      <p className="mb-6 text-sm text-muted">Retrouve tes produits et tes calculs.</p>
      {erreur === "lien" && (
        <div className="mb-4">
          <Alert>Ce lien de confirmation est invalide ou a expiré. Connecte-toi ou recrée ton compte.</Alert>
        </div>
      )}
      <AuthForm mode="connexion" action={signIn} />
    </>
  );
}
