import { round2, type CostBreakdown } from "./pricing";

export type CostSegment = { key: "materials" | "accessories" | "labor" | "extras"; label: string; value: number; share: number };

/** Répartition du coût de revient pour le graphique en anneau (parts en %, total = 100). */
export function costSegments(cost: CostBreakdown): CostSegment[] {
  const parts: Omit<CostSegment, "share">[] = [
    { key: "materials", label: "Matières", value: cost.materials },
    { key: "labor", label: "Main-d'œuvre", value: cost.labor },
    { key: "accessories", label: "Accessoires", value: cost.accessories },
    { key: "extras", label: "Autres frais", value: cost.extras },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!(total > 0)) return [];
  const withShare = parts.filter((p) => p.value > 0).map((p) => ({ ...p, share: round2((p.value / total) * 100) }));
  // Corrige l'arrondi pour que la somme fasse exactement 100.
  const drift = round2(100 - withShare.reduce((s, p) => s + p.share, 0));
  if (drift !== 0) {
    const biggest = withShare.reduce((a, b) => (b.share > a.share ? b : a));
    biggest.share = round2(biggest.share + drift);
  }
  return withShare;
}
