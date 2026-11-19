"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import type { FormState } from "@/lib/validation/form";

type Props = {
  mode: "connexion" | "inscription";
  action: (prev: FormState, data: FormData) => Promise<FormState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const isSignUp = mode === "inscription";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert tone="ok">{state.message}</Alert>}

      <Field label="Email" htmlFor="email" error={fe.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          required
          className={inputClass}
          aria-invalid={Boolean(fe.email)}
          aria-describedby={fe.email ? "email-error" : undefined}
        />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        error={fe.password}
        hint={isSignUp ? "8 caractères minimum." : undefined}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          className={inputClass}
          aria-invalid={Boolean(fe.password)}
          aria-describedby={fe.password ? "password-error" : undefined}
        />
      </Field>
      {isSignUp && (
        <Field label="Confirme le mot de passe" htmlFor="confirm" error={fe.confirm}>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            aria-invalid={Boolean(fe.confirm)}
            aria-describedby={fe.confirm ? "confirm-error" : undefined}
          />
        </Field>
      )}

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Un instant…" : isSignUp ? "Créer mon compte" : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-muted">
        {isSignUp ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/connexion" className="font-medium text-accent hover:underline">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-accent hover:underline">
              Créer un compte
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
