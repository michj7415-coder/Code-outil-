import type { CostSegment } from "@/lib/cost-breakdown";
import { formatMoney } from "@/lib/pricing";

// Nuances de la couleur d'accent (+ gris pour les frais) : une seule teinte, lisible.
const COLORS: Record<CostSegment["key"], string> = {
  materials: "#4f46e5",
  labor: "#818cf8",
  accessories: "#c7d2fe",
  extras: "#a8a29e",
};

/** Graphique en anneau de la répartition du coût de revient, avec légende chiffrée. */
export function CostDonut({ segments, total, currency }: { segments: CostSegment[]; total: number; currency: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = segments.length > 1 ? 1.5 : 0; // petit espace entre les segments
  // Position de départ de chaque segment = somme des parts précédentes.
  const arcs = segments.map((s, i) => ({
    ...s,
    start: (segments.slice(0, i).reduce((t, x) => t + x.share, 0) / 100) * c,
    len: Math.max(0, (s.share / 100) * c - gap),
  }));

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Répartition du coût de revient">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f5f5f4" strokeWidth="12" />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={COLORS[a.key]}
              strokeWidth="12"
              strokeDasharray={`${a.len} ${c - a.len}`}
              strokeDashoffset={-a.start}
            >
              <title>{`${a.label} : ${Math.round(a.share)} %`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted">Total</span>
          <span className="text-sm font-semibold tabular-nums">{formatMoney(total, currency)}</span>
        </div>
      </div>
      {segments.length === 0 ? (
        <p className="text-sm text-muted">Ajoute tes coûts pour voir leur répartition.</p>
      ) : (
        <ul className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[s.key] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="font-medium tabular-nums">{Math.round(s.share)} %</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
