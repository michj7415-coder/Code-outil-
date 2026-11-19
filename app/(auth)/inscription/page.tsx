import type { Metadata } from "next";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Créer un compte</h1>
      <p className="mb-6 text-sm text-muted">Calcule le vrai coût de tes vêtements en quelques minutes.</p>
      <AuthForm mode="inscription" action={signUp} />
    </>
  );
}
