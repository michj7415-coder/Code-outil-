"use client";

import { useState } from "react";
import { Card, cx } from "@/components/ui";
import { formatMoney, formatPercent, type BreakEven, type CostInput, type PricingSettings } from "@/lib/pricing";
import { simulate } from "@/lib/simulator";
import { NumberInput, currencySymbol, parseNum } from "../../product-form";

export function Simulator({
  input,
  retailPriceTtc,
  settings,
  currency,
  defaultFixedCosts,
}: {
  input: CostInput;
  retailPriceTtc: number | null;
  settings: PricingSettings;
  currency: string;
  defaultFixedCosts: number;
}) {
  const [fabricPct, setFabricPct] = useState(0);
  const [laborPct, setLaborPct] = useState(0);
  const [pricePct, setPricePct] = useState(0);
  const [fixedCosts, setFixedCosts] = useState(defaultFixedCosts ? String(defaultFixedCosts).replace(".", ",") : "");

  const sim = simulate(input, settings, retailPriceTtc, { fabricPct, laborPct, pricePct, fixedCosts: parseNum(fixedCosts) });
  const money = (n: number) => formatMoney(n, currency);
  const { base, scenario, delta } = sim;
  const changed = fabricPct !== 0 || laborPct !== 0 || pricePct !== 0;
  const hasFabric = input.materials.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
      <Card className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Scénario</h2>
          {changed && (
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              onClick={() => {
                setFabricPct(0);
                setLaborPct(0);
                setPricePct(0);
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        <Slider
          id="fabric"
          label="Prix du tissu"
          value={fabricPct}
          onChange={setFabricPct}
          detail={hasFabric ? `Matières : ${money(base.pricing.cost.materials)} → ${money(scenario.pricing.cost.materials)}` : "Aucun tissu saisi pour ce produit."}
        />
        <Slider
          id="labor"
          label="Main-d'œuvre"
          value={laborPct}
          onChange={setLaborPct}
          detail={`${money(base.pricing.cost.labor)} → ${money(scenario.pricing.cost.labor)} par pièce`}
        />
        <Slider
          id="price"
          label="Prix de vente"
          value={pricePct}
          onChange={setPricePct}
          detail={`${money(base.pricing.priceTtc)} → ${money(scenario.pricing.priceTtc)} TTC${base.pricing.usesSuggestedPrice ? " (à partir du prix conseillé)" : ""}`}
        />

        <div className="flex flex-col gap-1.5 border-t border-line pt-5">
          <label htmlFor="fixedCosts" className="text-sm font-medium">
            Frais fixes à couvrir
          </label>
          <NumberInput id="fixedCosts" value={fixedCosts} onChange={setFixedCosts} suffix={currencySymbol(currency)} />
          <p className="text-xs text-muted">
            Ce que tu dois payer quelle que soit la quantité vendue : prototypes, shooting photo, site, salon, ton salaire…
            La valeur par défaut se règle dans les paramètres.
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card aria-live="polite">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 text-sm">
            <span className="text-xs text-muted" />
            <span className="text-right text-xs font-medium text-muted uppercase">Actuel</span>
            <span className="text-right text-xs font-medium text-muted uppercase">Scénario</span>

            <Line label="Coût de revient" before={money(base.pricing.cost.total)} after={money(scenario.pricing.cost.total)} delta={delta.cost} money={money} lowerIsBetter />
            <Line label="Prix de vente TTC" before={money(base.pricing.priceTtc)} after={money(scenario.pricing.priceTtc)} delta={delta.priceTtc} money={money} />
            <Line label="Marge par pièce" before={money(base.pricing.marginAmount)} after={money(scenario.pricing.marginAmount)} delta={delta.marginAmount} money={money} />
            <span className="font-medium">Marge</span>
            <span className="text-right tabular-nums">{formatPercent(base.pricing.marginRate, 1)}</span>
            <span
              className={cx(
                "text-right text-base font-semibold tabular-nums",
                scenario.pricing.marginRate != null && scenario.pricing.marginRate < settings.marginThreshold ? "text-warn" : "text-ok",
              )}
            >
              {formatPercent(scenario.pricing.marginRate, 1)}
            </span>
          </div>
          {delta.marginRate != null && delta.marginRate !== 0 && (
            <p className="mt-3 text-xs text-muted">
              {delta.marginRate > 0 ? "+" : "−"}
              {Math.abs(delta.marginRate).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} point{Math.abs(delta.marginRate) >= 2 ? "s" : ""} de marge
              par rapport à aujourd&apos;hui. Ton seuil est de {formatPercent(settings.marginThreshold)}.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-base font-semibold">Seuil de rentabilité</h2>
          <BreakEvenText result={scenario.breakEven} fixedCosts={parseNum(fixedCosts)} money={money} />
          {changed && base.breakEven.units != null && scenario.breakEven.units != null && delta.breakEvenUnits !== 0 && (
            <p className="mt-2 text-xs text-muted">
              Aujourd&apos;hui : {base.breakEven.units} pièces, soit {Math.abs(delta.breakEvenUnits!)} pièce
              {Math.abs(delta.breakEvenUnits!) > 1 ? "s" : ""} {delta.breakEvenUnits! > 0 ? "de plus" : "de moins"} à vendre dans ce scénario.
            </p>
          )}
        </Card>
        <p className="text-xs text-muted italic">
          Simulation indicative : les variations s&apos;appliquent à tous les tissus du produit. Rien n&apos;est enregistré.
        </p>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  onChange,
  detail,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${label} en pourcentage`}
            value={value}
            min={-90}
            max={200}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(Number.isFinite(v) ? Math.max(-90, Math.min(200, v)) : 0);
            }}
            className="h-8 w-16 rounded-md border border-line px-2 text-right text-sm tabular-nums"
          />
          <span className="text-sm text-muted">%</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={-50}
        max={100}
        step={1}
        value={Math.max(-50, Math.min(100, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
      <div className="flex justify-between text-[11px] text-muted">
        <span>−50 %</span>
        <span>0</span>
        <span>+100 %</span>
      </div>
      <p className="text-xs text-muted tabular-nums">{detail}</p>
    </div>
  );
}

function Line({
  label,
  before,
  after,
  delta,
  money,
  lowerIsBetter,
}: {
  label: string;
  before: string;
  after: string;
  delta: number;
  money: (n: number) => string;
  lowerIsBetter?: boolean;
}) {
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  return (
    <>
      <span>{label}</span>
      <span className="text-right text-muted tabular-nums">{before}</span>
      <span className="text-right tabular-nums">
        {after}
        {delta !== 0 && (
          <span className={cx("block text-[11px]", good ? "text-ok" : "text-warn")}>
            {delta > 0 ? "+" : "−"}
            {money(Math.abs(delta))}
          </span>
        )}
      </span>
    </>
  );
}

function BreakEvenText({ result, fixedCosts, money }: { result: BreakEven; fixedCosts: number; money: (n: number) => string }) {
  if (result.status === "no-fixed-costs") {
    return <p className="text-sm text-muted">Saisis tes frais fixes pour savoir combien de pièces vendre pour les couvrir.</p>;
  }
  if (result.status === "never") {
    return (
      <p className="text-sm text-bad">
        Jamais atteint : chaque pièce rapporte {money(result.unitMargin)}, les ventes ne peuvent pas couvrir tes frais fixes. Augmente
        ton prix ou baisse ton coût de revient.
      </p>
    );
  }
  return (
    <>
      <p className="text-3xl font-semibold tabular-nums">
        {result.units.toLocaleString("fr-FR")} <span className="text-base font-normal text-muted">pièces à vendre</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {money(fixedCosts)} de frais fixes ÷ {money(result.unitMargin)} de marge par pièce, arrondi à la pièce supérieure.
      </p>
    </>
  );
}
