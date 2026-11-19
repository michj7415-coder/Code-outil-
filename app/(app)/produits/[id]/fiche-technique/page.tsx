import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { loadProduct } from "../load";
import { TechSheetForm } from "./tech-sheet-form";

export const metadata: Metadata = { title: "Fiche technique" };

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

export default async function FicheTechniquePage({ params }: PageProps<"/produits/[id]/fiche-technique">) {
  const { id } = await params;
  const { product } = await loadProduct(id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <TechSheetForm
        id={id}
        initial={{ suppliers: product.suppliers, workshopNotes: product.workshopNotes, sizes: product.sizes }}
      />
      <Card className="flex flex-col gap-4 text-sm">
        <div>
          <h2 className="font-semibold">Repris dans le PDF</h2>
          <p className="text-xs text-muted">
            Matières et accessoires viennent de l&apos;onglet{" "}
            <Link href={`/produits/${id}`} className="text-accent hover:underline">
              Coûts et prix
            </Link>
            . Les prix n&apos;apparaissent pas dans la fiche destinée à l&apos;atelier.
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted uppercase">Matières</h3>
          {product.materials.length === 0 ? (
            <p className="text-muted">Aucune matière.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {product.materials.map((m, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{m.name}</span>
                  <span className="text-muted tabular-nums">{fmt(m.metersUsed)} m</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted uppercase">Accessoires</h3>
          {product.accessories.length === 0 ? (
            <p className="text-muted">Aucun accessoire.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {product.accessories.map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{a.name}</span>
                  <span className="text-muted tabular-nums">× {fmt(a.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <a href={`/produits/${id}/pdf`} target="_blank" rel="noopener" className="font-medium text-accent hover:underline">
          Ouvrir le PDF →
        </a>
      </Card>
    </div>
  );
}
