import Link from "next/link";
import type { ProductInsight } from "@/lib/insights";
import { formatMoney, formatPercent } from "@/lib/pricing";
import { categoryLabel } from "@/lib/validation/product";
import { IconImage } from "./icons";
import { MarginBadge, ProgressBar, cx, levelStyles } from "./ui";

/** Liste de produits avec code couleur de marge et complétion. */
export function ProductRows({
  rows,
  photos,
  currency,
  actions,
}: {
  rows: ProductInsight[];
  photos: Record<string, string>;
  currency: string;
  actions?: (id: string) => React.ReactNode;
}) {
  const money = (n: number) => formatMoney(n, currency);
  return (
    <ul className="flex flex-col gap-3 md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-white">
      <li className="hidden grid-cols-[56px_minmax(0,1fr)_110px_110px_140px_96px_auto] items-center gap-4 border-b border-line bg-stone-50 px-5 py-3 text-xs font-medium text-muted md:grid">
        <span />
        <span>Produit</span>
        <span className="text-right">Coût de revient</span>
        <span className="text-right">Prix de vente</span>
        <span>Fiche</span>
        <span className="text-right">Marge</span>
        <span className="w-20" />
      </li>
      {rows.map(({ product: p, pricing, level, completion }) => {
        const photo = p.photoPath ? photos[p.photoPath] : null;
        return (
          <li
            key={p.id}
            className="relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-white p-4 md:grid-cols-[56px_minmax(0,1fr)_110px_110px_140px_96px_auto] md:rounded-none md:border-0 md:border-b md:px-5 md:last:border-b-0"
          >
            <span className={cx("absolute top-4 bottom-4 left-0 w-1 rounded-r-full md:top-3 md:bottom-3", levelStyles[level].dot)} aria-hidden />
            <div className="row-span-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-stone-400 md:row-span-1">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <IconImage width={20} height={20} />
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/produits/${p.id}`} className="block truncate font-medium after:absolute after:inset-0 hover:text-accent">
                {p.name}
              </Link>
              <p className="text-xs text-muted">{categoryLabel(p.category)}</p>
            </div>
            <div className="text-right md:hidden">
              <MarginBadge level={level}>{formatPercent(pricing.marginRate, 0)}</MarginBadge>
            </div>
            <p className="hidden text-right text-sm tabular-nums md:block">{money(pricing.cost.total)}</p>
            <p className="hidden text-right text-sm tabular-nums md:block">
              {money(pricing.priceTtc)}
              {p.retailPriceTtc == null && <span className="text-muted" title="Prix non saisi : prix conseillé">*</span>}
            </p>
            <ProgressBar percent={completion.percent} className="hidden md:flex" />
            <div className="hidden text-right md:block">
              <MarginBadge level={level}>{formatPercent(pricing.marginRate, 0)}</MarginBadge>
            </div>
            <div className="col-span-2 col-start-2 flex flex-col gap-2 md:hidden">
              <p className="text-xs text-muted tabular-nums">
                Coût {money(pricing.cost.total)} · Vente {money(pricing.priceTtc)}
                {p.retailPriceTtc == null && "*"}
              </p>
              <ProgressBar percent={completion.percent} />
            </div>
            {actions && (
              <div className="relative z-10 col-start-3 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">{actions(p.id)}</div>
            )}
            {!actions && <span className="hidden w-20 md:block" />}
          </li>
        );
      })}
    </ul>
  );
}

export function MarginLegend({ threshold }: { threshold: number }) {
  const items = [
    { level: "ok" as const, text: `≥ ${threshold} %` },
    { level: "warn" as const, text: `${Math.max(0, threshold - 10)} à ${threshold} %` },
    { level: "bad" as const, text: `< ${Math.max(0, threshold - 10)} % ou à perte` },
  ];
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span>Marge :</span>
      {items.map((i) => (
        <span key={i.level} className="inline-flex items-center gap-1.5">
          <span className={cx("h-2 w-2 rounded-full", levelStyles[i.level].dot)} aria-hidden />
          {i.text}
        </span>
      ))}
    </p>
  );
}
