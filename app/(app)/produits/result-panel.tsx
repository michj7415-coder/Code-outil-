"use client";

import { Card, cx } from "@/components/ui";
import { ADVICE_DISCLAIMER, buildAdvice, type PeerPrice } from "@/lib/advice";
import { formatMoney, formatPercent, type PricingResult, type PricingSettings } from "@/lib/pricing";
import { categoryLabel } from "@/lib/validation/product";

export function ResultPanel({
  pricing,
  settings,
  currency,
  category,
  productId,
  peers,
  onUseSuggested,
}: {
  pricing: PricingResult;
  settings: PricingSettings;
  currency: string;
  category: string;
  productId?: string;
  peers: PeerPrice[];
  onUseSuggested?: () => void;
}) {
  const money = (n: number) => formatMoney(n, currency);
  const below = pricing.marginRate != null && pricing.marginRate < settings.marginThreshold;
  const advice = buildAdvice({ pricing, settings, currency, category, categoryLabel: categoryLabel(category), productId, peers });

  return (
    <>
      <Card aria-live="polite" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Coût de revient</p>
          <p className="text-3xl font-semibold tabular-nums">{money(pricing.cost.total)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <Row label="Matières" value={money(pricing.cost.materials)} />
          <Row label="Accessoires" value={money(pricing.cost.accessories)} />
          <Row label="Main-d'œuvre" value={money(pricing.cost.labor)} />
          <Row label="Autres frais" value={money(pricing.cost.extras)} />
        </dl>

        <div className="border-t border-line pt-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Prix conseillés</p>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <Row label="Gros HT" value={money(pricing.suggested.wholesaleHt)} />
            <Row label="Public HT" value={money(pricing.suggested.retailHt)} />
            <Row label="Public TTC" value={money(pricing.suggested.retailTtc)} strong />
          </dl>
          {onUseSuggested && pricing.cost.total > 0 && (
            <button type="button" onClick={onUseSuggested} className="mt-2 text-xs font-medium text-accent hover:underline">
              Utiliser ce prix
            </button>
          )}
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Marge réelle {pricing.usesSuggestedPrice && <span className="normal-case">(sur le prix conseillé)</span>}
          </p>
          <p className={cx("text-2xl font-semibold tabular-nums", below ? "text-warn" : "text-ok")}>
            {formatPercent(pricing.marginRate, 1)}
          </p>
          <p className="text-sm text-muted tabular-nums">
            {money(pricing.marginAmount)} par pièce · vendu {money(pricing.priceTtc)} TTC ({money(pricing.priceHt)} HT)
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Conseils</h2>
        <ul className="flex flex-col gap-3">
          {advice.map((a) => (
            <li
              key={a.id}
              className={cx(
                "rounded-lg border-l-4 bg-stone-50 px-3 py-2",
                a.tone === "warn" && "border-warn bg-amber-50/60",
                a.tone === "ok" && "border-ok bg-green-50/60",
                a.tone === "info" && "border-accent",
              )}
            >
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">{a.detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted italic">{ADVICE_DISCLAIMER}</p>
      </Card>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className={cx("text-right tabular-nums", strong && "font-semibold")}>{value}</dd>
    </>
  );
}
