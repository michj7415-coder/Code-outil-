import Link from "next/link";
import { ProgressBar, buttonClass, cx } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { computeCompletion } from "@/lib/insights";
import { categoryLabel } from "@/lib/validation/product";
import { deleteProduct, duplicateProduct } from "../actions";
import { DeleteButton } from "./delete-button";
import { loadProduct } from "./load";
import { ProductTabs } from "./tabs";

export default async function ProductLayout({ children, params }: LayoutProps<"/produits/[id]">) {
  const { id } = await params;
  const { product } = await loadProduct(id);
  const completion = computeCompletion(product);
  const complete = completion.missing.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href="/produits" className="text-sm text-muted hover:text-ink">
          ← Mes produits
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            <p className="mt-1 text-sm text-muted">{categoryLabel(product.category)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/produits/${id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "h-10 text-xs")}>
              Fiche technique PDF
            </a>
            <form action={duplicateProduct}>
              <input type="hidden" name="id" value={id} />
              <button className={buttonClass("secondary", "h-10 text-xs")}>Dupliquer</button>
            </form>
            <DeleteButton id={id} name={product.name} action={deleteProduct} />
          </div>
        </div>

        {/* Complétion de la fiche */}
        <div className={cx("rounded-2xl border p-4", complete ? "border-green-200 bg-green-50/50" : "border-line bg-white")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {complete ? (
                <span className="inline-flex items-center gap-1.5 text-ok">
                  <IconCheck width={16} height={16} /> Fiche complète
                </span>
              ) : (
                <>
                  Fiche complète à {completion.percent} %{" "}
                  <span className="font-normal text-muted">
                    ({completion.done}/{completion.total})
                  </span>
                </>
              )}
            </p>
          </div>
          <ProgressBar percent={completion.percent} className="mt-2" />
          {!complete && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Il manque :</span>
              {completion.missing.map((m) => (
                <Link
                  key={m.key}
                  href={m.tab === "fiche" ? `/produits/${id}/fiche-technique` : `/produits/${id}`}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  + {m.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <ProductTabs id={id} />
      </div>
      {children}
    </div>
  );
}
