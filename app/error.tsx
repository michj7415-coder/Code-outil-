"use client";

import { useEffect } from "react";

// Erreur inattendue pendant l'affichage d'une page.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center">
        <h1 className="text-lg font-semibold">Oups, la page n&apos;a pas pu s&apos;afficher</h1>
        <p className="mt-2 text-sm text-muted">
          Vérifie ta connexion puis réessaie. Si le problème continue, vérifie que la base Supabase est bien configurée
          (les deux fichiers SQL exécutés, les variables d&apos;environnement renseignées).
        </p>
        <button
          onClick={() => retry()}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-stone-800"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
