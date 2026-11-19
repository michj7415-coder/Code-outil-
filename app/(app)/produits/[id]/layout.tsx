import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { categoryLabel } from "@/lib/validation/product";
import { deleteProduct, duplicateProduct } from "../actions";
import { DeleteButton } from "./delete-button";
import { loadProduct } from "./load";
import { ProductTabs } from "./tabs";

export default async function ProductLayout({ children, params }: LayoutProps<"/produits/[id]">) {
  const { id } = await params;
  const { product } = await loadProduct(id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link href="/produits" className="text-sm text-muted hover:text-ink">
          ← Mes produits
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted">{categoryLabel(product.category)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/produits/${id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "h-9 text-xs")}>
              Fiche technique PDF
            </a>
            <form action={duplicateProduct}>
              <input type="hidden" name="id" value={id} />
              <button className={buttonClass("secondary", "h-9 text-xs")}>Dupliquer</button>
            </form>
            <DeleteButton id={id} name={product.name} action={deleteProduct} />
          </div>
        </div>
        <ProductTabs id={id} />
      </div>
      {children}
    </div>
  );
}
