"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Field, cx, inputClass } from "@/components/ui";
import { computePricing, formatMoney, type PricingSettings } from "@/lib/pricing";
import { CATEGORIES, PHOTO_MAX_BYTES, PHOTO_TYPES, productSchema, type Category } from "@/lib/validation/product";
import { toFieldErrors, type FormState } from "@/lib/validation/form";
import { saveProduct } from "./actions";
import { ResultPanel } from "./result-panel";
import type { PeerPrice } from "@/lib/advice";

/** Valeurs du formulaire : les nombres restent des chaînes tant qu'on tape (« 12,5 »). */
type MaterialRow = { key: string; name: string; pricePerMeter: string; metersUsed: string };
type AccessoryRow = { key: string; name: string; unitPrice: string; quantity: string };
type ExtraRow = { key: string; label: string; kind: "amount" | "percent"; value: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  category: Category;
  laborCost: number;
  retailPriceTtc: number | null;
  photoUrl: string | null;
  materials: { name: string; pricePerMeter: number; metersUsed: number }[];
  accessories: { name: string; unitPrice: number; quantity: number }[];
  extraCosts: { label: string; kind: "amount" | "percent"; value: number }[];
};

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const str = (n: number | null | undefined) => (n == null || n === 0 ? "" : String(n).replace(".", ","));

/** « 12,50 » → 12.5 ; vide ou invalide → 0 (pour le calcul en direct). */
export function parseNum(v: string): number {
  const n = Number(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const ACCESSORY_SUGGESTIONS = ["Boutons", "Fermeture éclair", "Étiquette tissée", "Étiquette composition", "Emballage"];
const EXTRA_SUGGESTIONS = ["Transport", "Douane", "Chutes"];

export function ProductForm({
  initial,
  settings,
  currency,
  peers,
}: {
  initial: ProductFormValues;
  settings: PricingSettings;
  currency: string;
  peers: PeerPrice[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveProduct, {});

  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<Category>(initial.category);
  const [laborCost, setLaborCost] = useState(str(initial.laborCost));
  const [retailPrice, setRetailPrice] = useState(str(initial.retailPriceTtc));
  const [materials, setMaterials] = useState<MaterialRow[]>(() =>
    initial.materials.map((m) => ({ key: newKey(), name: m.name, pricePerMeter: str(m.pricePerMeter), metersUsed: str(m.metersUsed) })),
  );
  const [accessories, setAccessories] = useState<AccessoryRow[]>(() =>
    initial.accessories.map((a) => ({ key: newKey(), name: a.name, unitPrice: str(a.unitPrice), quantity: str(a.quantity) })),
  );
  const [extras, setExtras] = useState<ExtraRow[]>(() =>
    initial.extraCosts.map((e) => ({ key: newKey(), label: e.label, kind: e.kind, value: str(e.value) })),
  );

  const [photoPreview, setPhotoPreview] = useState<string | null>(initial.photoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // React vide le champ fichier après l'envoi du formulaire. En cas d'erreur,
  // la photo choisie n'a pas été enregistrée : on retire son aperçu.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.error && photoPreview?.startsWith("blob:")) setPhotoPreview(initial.photoUrl);
  }

  // Les lignes laissées entièrement vides sont ignorées à l'enregistrement.
  const keptMaterials = materials.filter((m) => !isBlank(m.name, m.pricePerMeter, m.metersUsed));
  const keptAccessories = accessories.filter((a) => !isBlank(a.name, a.unitPrice));
  const keptExtras = extras.filter((e) => !isBlank(e.label, e.value));

  const payload = {
    name,
    category,
    laborCost,
    retailPriceTtc: retailPrice,
    materials: keptMaterials.map(({ name, pricePerMeter, metersUsed }) => ({ name, pricePerMeter, metersUsed })),
    accessories: keptAccessories.map(({ name, unitPrice, quantity }) => ({ name, unitPrice, quantity })),
    extraCosts: keptExtras.map(({ label, kind, value }) => ({ label, kind, value })),
  };

  // Après un premier envoi refusé, les erreurs se mettent à jour pendant la saisie.
  const liveCheck = state.fieldErrors ? productSchema.safeParse(payload) : null;
  const fe = liveCheck && !liveCheck.success ? toFieldErrors(liveCheck.error) : liveCheck ? {} : (state.fieldErrors ?? {});
  const showFormError = state.error && (!state.fieldErrors || Object.keys(fe).length > 0 || "photo" in (state.fieldErrors ?? {}));

  const pricing = useMemo(
    () =>
      computePricing(
        {
          materials: materials.map((m) => ({ name: m.name, pricePerMeter: parseNum(m.pricePerMeter), metersUsed: parseNum(m.metersUsed) })),
          accessories: accessories.map((a) => ({ name: a.name, unitPrice: parseNum(a.unitPrice), quantity: parseNum(a.quantity) })),
          laborCost: parseNum(laborCost),
          extraCosts: extras.map((e) => ({ label: e.label, kind: e.kind, value: parseNum(e.value) })),
        },
        settings,
        retailPrice.trim() === "" ? null : parseNum(retailPrice),
      ),
    [materials, accessories, laborCost, extras, retailPrice, settings],
  );

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("La photo doit être au format JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("La photo ne doit pas dépasser 5 Mo.");
      e.target.value = "";
      return;
    }
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const err = (path: string) => fe[path];
  /** Erreur d'une ligne affichée : son index dans le payload ignore les lignes vides. */
  const lineErr = <T,>(kept: T[], row: T, field: string, section: string) => {
    const i = kept.indexOf(row);
    return i < 0 ? undefined : fe[`${section}.${i}.${field}`];
  };

  return (
    <form action={formAction} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="removePhoto" value={removePhoto ? "1" : "0"} />

      <div className="flex min-w-0 flex-col gap-4">
        {showFormError && <Alert>{state.error}</Alert>}
        {state.message && !pending && <Alert tone="ok">{state.message}</Alert>}

        {/* Informations */}
        <Card>
          <h2 className="mb-4 text-base font-semibold">Informations</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex shrink-0 flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-32 w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50 text-xs text-muted hover:border-stone-400"
                aria-label="Choisir une photo"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Photo du produit" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center">Ajouter une photo</span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                name="photo"
                accept={PHOTO_TYPES.join(",")}
                onChange={onPhotoChange}
                className="sr-only"
              />
              {photoPreview && (
                <button
                  type="button"
                  className="text-xs text-muted hover:text-bad"
                  onClick={() => {
                    setPhotoPreview(null);
                    setRemovePhoto(true);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Retirer la photo
                </button>
              )}
              {(photoError || err("photo")) && <p className="max-w-28 text-xs text-bad">{photoError || err("photo")}</p>}
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <Field label="Nom du produit" htmlFor="name" error={err("name")}>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Ex. T-shirt Héloïse"
                  aria-invalid={Boolean(err("name"))}
                  maxLength={120}
                />
              </Field>
              <Field label="Catégorie" htmlFor="category" error={err("category")}>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        {/* Matières */}
        <Card>
          <SectionHeader title="Matières" total={formatMoney(pricing.cost.materials, currency)} />
          <LineList
            empty="Ajoute le ou les tissus utilisés."
            rows={materials}
            onRemove={(k) => setMaterials((r) => r.filter((x) => x.key !== k))}
            render={(row) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_110px]">
                <LineInput
                  className="col-span-2 sm:col-span-1"
                  label="Tissu"
                  value={row.name}
                  placeholder="Ex. Jersey coton bio"
                  error={lineErr(keptMaterials, row, "name", "materials")}
                  onChange={(v) => setMaterials(update(materials, row.key, { name: v }))}
                />
                <LineInput
                  label="Prix au mètre"
                  suffix={currencySymbol(currency)}
                  numeric
                  value={row.pricePerMeter}
                  error={lineErr(keptMaterials, row, "pricePerMeter", "materials")}
                  onChange={(v) => setMaterials(update(materials, row.key, { pricePerMeter: v }))}
                />
                <LineInput
                  label="Métrage"
                  suffix="m"
                  numeric
                  value={row.metersUsed}
                  error={lineErr(keptMaterials, row, "metersUsed", "materials")}
                  onChange={(v) => setMaterials(update(materials, row.key, { metersUsed: v }))}
                />
              </div>
            )}
          />
          <AddButton onClick={() => setMaterials([...materials, { key: newKey(), name: "", pricePerMeter: "", metersUsed: "" }])}>
            Ajouter un tissu
          </AddButton>
        </Card>

        {/* Accessoires */}
        <Card>
          <SectionHeader title="Accessoires" total={formatMoney(pricing.cost.accessories, currency)} />
          <LineList
            empty="Boutons, fermetures, étiquettes, emballage…"
            rows={accessories}
            onRemove={(k) => setAccessories((r) => r.filter((x) => x.key !== k))}
            render={(row) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_110px]">
                <LineInput
                  className="col-span-2 sm:col-span-1"
                  label="Accessoire"
                  value={row.name}
                  placeholder="Ex. Boutons nacre"
                  list="accessory-suggestions"
                  error={lineErr(keptAccessories, row, "name", "accessories")}
                  onChange={(v) => setAccessories(update(accessories, row.key, { name: v }))}
                />
                <LineInput
                  label="Prix unitaire"
                  suffix={currencySymbol(currency)}
                  numeric
                  value={row.unitPrice}
                  error={lineErr(keptAccessories, row, "unitPrice", "accessories")}
                  onChange={(v) => setAccessories(update(accessories, row.key, { unitPrice: v }))}
                />
                <LineInput
                  label="Quantité"
                  numeric
                  value={row.quantity}
                  error={lineErr(keptAccessories, row, "quantity", "accessories")}
                  onChange={(v) => setAccessories(update(accessories, row.key, { quantity: v }))}
                />
              </div>
            )}
          />
          <datalist id="accessory-suggestions">
            {ACCESSORY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <AddButton onClick={() => setAccessories([...accessories, { key: newKey(), name: "", unitPrice: "", quantity: "1" }])}>
            Ajouter un accessoire
          </AddButton>
        </Card>

        {/* Main-d'œuvre */}
        <Card>
          <SectionHeader title="Main-d'œuvre" total={formatMoney(pricing.cost.labor, currency)} />
          <Field label="Coût de fabrication par pièce" htmlFor="laborCost" error={err("laborCost")} hint="Façon, coupe et montage facturés par l'atelier.">
            <NumberInput id="laborCost" value={laborCost} onChange={setLaborCost} suffix={currencySymbol(currency)} invalid={Boolean(err("laborCost"))} />
          </Field>
        </Card>

        {/* Autres frais */}
        <Card>
          <SectionHeader title="Autres frais" total={formatMoney(pricing.cost.extras, currency)} />
          <LineList
            empty="Transport, douane, chutes… en euros ou en % du coût de fabrication."
            rows={extras}
            onRemove={(k) => setExtras((r) => r.filter((x) => x.key !== k))}
            render={(row) => (
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_120px_auto]">
                <LineInput
                  className="col-span-2 sm:col-span-1"
                  label="Frais"
                  value={row.label}
                  placeholder="Ex. Transport"
                  list="extra-suggestions"
                  error={lineErr(keptExtras, row, "label", "extraCosts")}
                  onChange={(v) => setExtras(update(extras, row.key, { label: v }))}
                />
                <LineInput
                  label="Valeur"
                  numeric
                  value={row.value}
                  error={lineErr(keptExtras, row, "value", "extraCosts")}
                  onChange={(v) => setExtras(update(extras, row.key, { value: v }))}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Unité</span>
                  <div className="flex h-10 overflow-hidden rounded-lg border border-line" role="radiogroup" aria-label="Unité du frais">
                    {(["amount", "percent"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={row.kind === k}
                        onClick={() => setExtras(update(extras, row.key, { kind: k }))}
                        className={cx("w-11 text-sm", row.kind === k ? "bg-ink text-white" : "bg-white text-muted hover:bg-stone-50")}
                      >
                        {k === "amount" ? currencySymbol(currency) : "%"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          />
          <datalist id="extra-suggestions">
            {EXTRA_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <AddButton onClick={() => setExtras([...extras, { key: newKey(), label: "", kind: "amount", value: "" }])}>
            Ajouter un frais
          </AddButton>
        </Card>

        {/* Prix de vente */}
        <Card>
          <h2 className="mb-4 text-base font-semibold">Ton prix de vente</h2>
          <Field
            label="Prix public TTC"
            htmlFor="retailPriceTtc"
            error={err("retailPriceTtc")}
            hint={`Laisse vide pour utiliser le prix conseillé (${formatMoney(pricing.suggested.retailTtc, currency)}).`}
          >
            <NumberInput id="retailPriceTtc" value={retailPrice} onChange={setRetailPrice} suffix={currencySymbol(currency)} invalid={Boolean(err("retailPriceTtc"))} />
          </Field>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <ResultPanel
          pricing={pricing}
          settings={settings}
          currency={currency}
          category={category}
          productId={initial.id}
          peers={peers}
          onUseSuggested={() => setRetailPrice(str(pricing.suggested.retailTtc))}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Enregistrement…" : initial.id ? "Enregistrer les modifications" : "Créer le produit"}
        </Button>
      </div>
    </form>
  );
}

function isBlank(...values: string[]) {
  return values.every((v) => v.trim() === "");
}

function update<T extends { key: string }>(rows: T[], key: string, patch: Partial<T>): T[] {
  return rows.map((r) => (r.key === key ? { ...r, ...patch } : r));
}

export function currencySymbol(currency: string) {
  return (
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ??
    currency
  );
}

function SectionHeader({ title, total }: { title: string; total: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <span className="text-sm text-muted tabular-nums">{total}</span>
    </div>
  );
}

function LineList<T extends { key: string }>({
  rows,
  render,
  onRemove,
  empty,
}: {
  rows: T[];
  render: (row: T) => React.ReactNode;
  onRemove: (key: string) => void;
  empty: string;
}) {
  if (rows.length === 0) return <p className="mb-3 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mb-3 flex flex-col divide-y divide-line">
      {rows.map((row) => (
        <li key={row.key} className="flex items-start gap-2 py-3 first:pt-0">
          <div className="min-w-0 flex-1">{render(row)}</div>
          <button
            type="button"
            onClick={() => onRemove(row.key)}
            className="mt-5 flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-bad"
            aria-label="Supprimer la ligne"
            title="Supprimer la ligne"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function LineInput({
  label,
  value,
  onChange,
  error,
  numeric,
  suffix,
  placeholder,
  className,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  numeric?: boolean;
  suffix?: string;
  placeholder?: string;
  className?: string;
  list?: string;
}) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs text-muted">{label}</span>
      {numeric ? (
        <NumberInput value={value} onChange={onChange} suffix={suffix} invalid={Boolean(error)} ariaLabel={label} />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          list={list}
          maxLength={120}
        />
      )}
      {error && <span className="text-xs text-bad">{error}</span>}
    </label>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  suffix,
  invalid,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,\s-]/g, ""))}
        className={cx(inputClass, "tabular-nums", suffix && "pr-8")}
        placeholder="0"
        aria-invalid={invalid}
        aria-label={ariaLabel}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>}
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium text-accent hover:underline">
      + {children}
    </button>
  );
}
