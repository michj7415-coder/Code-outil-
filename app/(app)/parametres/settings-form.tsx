"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import type { Settings } from "@/lib/data";
import { formatMoney, suggestedPrices } from "@/lib/pricing";
import { CURRENCIES } from "@/lib/validation/settings";
import type { FormState } from "@/lib/validation/form";
import { parseNum } from "../produits/product-form";
import { saveSettings } from "./actions";

const str = (n: number) => String(n).replace(".", ",");

export function SettingsForm({ initial }: { initial: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const [, startTransition] = useTransition();
  const fe = state.fieldErrors ?? {};
  const [v, setV] = useState({
    marginThreshold: str(initial.marginThreshold),
    vatRate: str(initial.vatRate),
    wholesaleCoef: str(initial.wholesaleCoef),
    retailCoef: str(initial.retailCoef),
    currency: initial.currency,
    fixedCosts: str(initial.fixedCosts),
  });
  const on = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  const example = suggestedPrices(20, {
    wholesaleCoef: parseNum(v.wholesaleCoef),
    retailCoef: parseNum(v.retailCoef),
    vatRate: parseNum(v.vatRate),
    marginThreshold: parseNum(v.marginThreshold),
  });
  const money = (n: number) => formatMoney(n, v.currency);

  const input = (k: keyof typeof v, suffix?: string) => (
    <div className="relative">
      <input
        id={k}
        name={k}
        inputMode="decimal"
        value={v[k]}
        onChange={on(k)}
        className={`${inputClass} tabular-nums ${suffix ? "pr-10" : ""}`}
        aria-invalid={Boolean(fe[k])}
        aria-describedby={fe[k] ? `${k}-error` : undefined}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>}
    </div>
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      // Envoi sans la réinitialisation automatique de React, qui remettrait la liste des devises à zéro.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && !pending && <Alert tone="ok">{state.message}</Alert>}

      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Calcul des prix conseillés</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Coefficient de gros" htmlFor="wholesaleCoef" error={fe.wholesaleCoef} hint="Coût × coefficient = prix de gros HT">
            {input("wholesaleCoef", "×")}
          </Field>
          <Field label="Coefficient de détail" htmlFor="retailCoef" error={fe.retailCoef} hint="Gros × coefficient = prix public HT">
            {input("retailCoef", "×")}
          </Field>
          <Field label="TVA" htmlFor="vatRate" error={fe.vatRate} hint="20 % en France">
            {input("vatRate", "%")}
          </Field>
        </div>
        <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-muted tabular-nums">
          Exemple : un coût de revient de {money(20)} donne un prix de gros de {money(example.wholesaleHt)} HT, un prix public de{" "}
          {money(example.retailHt)} HT, soit <strong className="text-ink">{money(example.retailTtc)} TTC</strong>.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Alertes et simulation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seuil de marge" htmlFor="marginThreshold" error={fe.marginThreshold} hint="Alerte si la marge passe sous ce seuil">
            {input("marginThreshold", "%")}
          </Field>
          <Field label="Frais fixes par défaut" htmlFor="fixedCosts" error={fe.fixedCosts} hint="Proposés dans le simulateur">
            {input("fixedCosts")}
          </Field>
        </div>
      </Card>

      <Card>
        <Field label="Devise" htmlFor="currency" error={fe.currency}>
          <select id="currency" name="currency" value={v.currency} onChange={on("currency")} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
