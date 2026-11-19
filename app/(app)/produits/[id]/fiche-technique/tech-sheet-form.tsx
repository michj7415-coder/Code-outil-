"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { toFieldErrors, type FormState } from "@/lib/validation/form";
import { techSheetSchema } from "@/lib/validation/product";
import type { SizeRow } from "@/lib/data";
import { saveTechSheet } from "../../actions";

const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const DEFAULT_MEASURES = ["Tour de poitrine", "Longueur totale", "Longueur de manche"];

type Row = SizeRow & { key: string };
let seq = 0;
const withKey = (r: SizeRow): Row => ({ ...r, key: `r${++seq}` });
const empty = (label = ""): SizeRow => ({ measureLabel: label, xs: "", s: "", m: "", l: "", xl: "" });

export function TechSheetForm({
  id,
  initial,
}: {
  id: string;
  initial: { suppliers: string; workshopNotes: string; sizes: SizeRow[] };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTechSheet, {});
  const [suppliers, setSuppliers] = useState(initial.suppliers);
  const [notes, setNotes] = useState(initial.workshopNotes);
  const [rows, setRows] = useState<Row[]>(() =>
    (initial.sizes.length ? initial.sizes : DEFAULT_MEASURES.map((l) => empty(l))).map(withKey),
  );

  // Lignes entièrement vides ignorées
  const kept = rows.filter((r) => [r.measureLabel, ...SIZES.map((s) => r[s])].some((v) => v.trim() !== ""));
  const payload = {
    suppliers,
    workshopNotes: notes,
    sizes: kept.map(({ measureLabel, xs, s, m, l, xl }) => ({ measureLabel, xs, s, m, l, xl })),
  };
  const live = state.fieldErrors ? techSheetSchema.safeParse(payload) : null;
  const fe = live && !live.success ? toFieldErrors(live.error) : live ? {} : (state.fieldErrors ?? {});
  const rowErr = (r: Row, field: string) => {
    const i = kept.indexOf(r);
    return i < 0 ? undefined : fe[`sizes.${i}.${field}`];
  };
  const set = (key: string, patch: Partial<SizeRow>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} noValidate className="flex min-w-0 flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {state.error && Object.keys(fe).length > 0 && <Alert>{state.error}</Alert>}
      {state.error && !state.fieldErrors && <Alert>{state.error}</Alert>}
      {state.message && !pending && <Alert tone="ok">{state.message}</Alert>}

      <Card>
        <h2 className="mb-1 text-base font-semibold">Tableau de mesures</h2>
        <p className="mb-4 text-xs text-muted">En centimètres ou dans l&apos;unité de ton choix. Champs libres.</p>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-1 font-medium">Mesure</th>
                {SIZES.map((s) => (
                  <th key={s} className="w-16 pb-1 text-center font-medium uppercase">
                    {s}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="pr-2 align-top">
                    <input
                      value={r.measureLabel}
                      onChange={(e) => set(r.key, { measureLabel: e.target.value })}
                      className={inputClass}
                      placeholder="Ex. Tour de taille"
                      aria-label="Nom de la mesure"
                      aria-invalid={Boolean(rowErr(r, "measureLabel"))}
                      maxLength={80}
                    />
                    {rowErr(r, "measureLabel") && <p className="mt-1 text-xs text-bad">{rowErr(r, "measureLabel")}</p>}
                  </td>
                  {SIZES.map((s) => (
                    <td key={s} className="px-0.5 align-top">
                      <input
                        value={r[s]}
                        onChange={(e) => set(r.key, { [s]: e.target.value })}
                        className={`${inputClass} px-1 text-center tabular-nums`}
                        aria-label={`${r.measureLabel || "Mesure"} taille ${s.toUpperCase()}`}
                        maxLength={30}
                      />
                    </td>
                  ))}
                  <td className="align-top">
                    <button
                      type="button"
                      onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                      className="flex h-10 w-8 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-bad"
                      aria-label="Supprimer la mesure"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setRows([...rows, withKey(empty())])} className="mt-2 text-sm font-medium text-accent hover:underline">
          + Ajouter une mesure
        </button>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label="Fournisseurs" htmlFor="suppliers" error={fe.suppliers} hint="Tissus, accessoires, contacts, références…">
          <textarea
            id="suppliers"
            value={suppliers}
            onChange={(e) => setSuppliers(e.target.value)}
            rows={4}
            className={`${inputClass} h-auto py-2`}
            placeholder={"Ex. Molleton gratté : Tissus Lebrun, réf. MG-320\nBoutons : Mercerie Martin"}
          />
        </Field>
        <Field label="Consignes pour l'atelier" htmlFor="workshopNotes" error={fe.workshopNotes}>
          <textarea
            id="workshopNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className={`${inputClass} h-auto py-2`}
            placeholder={"Ex. Surpiqûres 3 mm fil assorti. Étiquette de marque au milieu dos, 2 cm sous la couture. Lavage à 30 °C avant coupe."}
          />
        </Field>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la fiche technique"}
        </Button>
      </div>
    </form>
  );
}
