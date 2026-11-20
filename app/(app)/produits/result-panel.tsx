"use client";

import { Button, Card, MarginBadge, cx, levelStyles } from "@/components/ui";
import { CostDonut } from "@/components/cost-donut";
import { IconAlert, IconCheck, IconChart } from "@/components/icons";
import { ADVICE_DISCLAIMER, buildAdvice, type Advice, type PeerPrice } from "@/lib/advice";
import { costSegments } from "@/lib/cost-breakdown";
import { marginLevel } from "@/lib/insights";
import { formatMoney, formatPercent, type PricingResult, type PricingSettings } from "@/lib/pricing";
import { categoryLabel } from "@/lib/validation/product";

type Props = {
  pricing: PricingResult;
  settings: PricingSettings;
  currency: string;
  category: string;
  productId?: string;
  peers: PeerPrice[];
  onUseSuggested?: () => void;
  submitLabel: string;
  pending: boolean;
};

/**
 * Résultats en direct. Sur grand écran : colonne fixe (coût, prix conseillé, marge,
 * anneau, conseils). Sur téléphone : barre fixe en bas + détail sous le formulaire.
 */
export function ResultPanel(props: Props) {
  const { pricing, settings, currency, category, productId, peers, onUseSuggested, submitLabel, pending } = props;
  const money = (n: number) => formatMoney(n, currency);
  const level = marginLevel(pricing.marginRate, settings.marginThreshold);
  const advice = buildAdvice({ pricing, settings, currency, category, categoryLabel: categoryLabel(category), productId, peers });

  return (
    <>
      <aside
        id="resultats"
        className="flex scroll-mt-24 flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto lg:pb-2"
        aria-label="Résultats en direct"
      >
        {/* Encadré principal */}
        <Card aria-live="polite" className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted">Coût de revient</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money(pricing.cost.total)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Prix conseillé TTC</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-accent tabular-nums">{money(pricing.suggested.retailTtc)}</p>
              {onUseSuggested && pricing.cost.total > 0 && (
                <button type="button" onClick={onUseSuggested} className="mt-0.5 text-xs font-medium text-accent hover:underline">
                  Utiliser ce prix
                </button>
              )}
            </div>
          </div>

          <div className={cx("rounded-xl p-4", levelStyles[level].soft)}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium">Marge réelle{pricing.usesSuggestedPrice && " (sur le prix conseillé)"}</p>
              <p className="text-2xl font-semibold tabular-nums">{formatPercent(pricing.marginRate, 1)}</p>
            </div>
            <p className="mt-1 text-xs tabular-nums opacity-90">
              {money(pricing.marginAmount)} par pièce · vendu {money(pricing.priceTtc)} TTC · seuil {formatPercent(settings.marginThreshold)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <Row label="Prix de gros HT" value={money(pricing.suggested.wholesaleHt)} />
            <Row label="Prix public HT" value={money(pricing.suggested.retailHt)} />
          </dl>

          <div className="hidden lg:block">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement…" : submitLabel}
            </Button>
          </div>
        </Card>

        {/* Répartition des coûts */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Répartition du coût</h2>
          <CostDonut segments={costSegments(pricing.cost)} total={pricing.cost.total} currency={currency} />
        </Card>

        {/* Conseils */}
        <section aria-labelledby="conseils-title" className="flex flex-col gap-3">
          <h2 id="conseils-title" className="px-1 text-sm font-semibold">
            Conseils
          </h2>
          {advice.map((a) => (
            <AdviceCard key={a.id} advice={a} />
          ))}
          <p className="px-1 text-xs text-muted italic">{ADVICE_DISCLAIMER}</p>
        </section>
      </aside>

      {/* Barre fixe en bas (téléphone et tablette en portrait) */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(28,25,23,0.06)] backdrop-blur md:bottom-0 md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <a href="#resultats" className="grid min-w-0 flex-1 grid-cols-3 gap-2" aria-label="Voir le détail des résultats">
            <Mini label="Coût" value={money(pricing.cost.total)} />
            <Mini label="Conseillé" value={money(pricing.suggested.retailTtc)} className="text-accent" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted">Marge</p>
              <MarginBadge level={level}>{formatPercent(pricing.marginRate, 0)}</MarginBadge>
            </div>
          </a>
          <Button type="submit" disabled={pending} className="h-11 shrink-0 px-4">
            {pending ? "…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </>
  );
}

const ADVICE_STYLE: Record<Advice["tone"], { box: string; icon: React.ReactNode; label: string }> = {
  warn: { box: "border-amber-200", icon: <IconAlert width={16} height={16} className="text-warn" />, label: "Problème" },
  ok: { box: "border-green-200", icon: <IconCheck width={16} height={16} className="text-ok" />, label: "Bonne nouvelle" },
  info: { box: "border-line", icon: <IconChart width={16} height={16} className="text-accent" />, label: "Repère" },
};

function AdviceCard({ advice }: { advice: Advice }) {
  const st = ADVICE_STYLE[advice.tone];
  return (
    <article className={cx("rounded-2xl border bg-white p-4", st.box)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {st.icon} {st.label}
      </p>
      <h3 className="mt-1.5 text-sm font-semibold">{advice.title}</h3>
      <div className="mt-3 flex flex-col gap-2.5 text-xs leading-relaxed">
        <div>
          <p className="font-semibold text-stone-700">Pourquoi</p>
          <p className="text-stone-600">{advice.why}</p>
        </div>
        <div className="rounded-lg bg-stone-50 p-2.5">
          <p className="font-semibold text-stone-700">Que faire</p>
          <p className="text-stone-600">{advice.action}</p>
        </div>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cx("truncate text-sm font-semibold tabular-nums", className)}>{value}</p>
    </div>
  );
}
