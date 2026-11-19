import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getProduct, PHOTO_BUCKET } from "@/lib/data";
import { TechSheetDocument, type PdfPhoto } from "@/lib/pdf/tech-sheet";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, ctx: RouteContext<"/produits/[id]/pdf">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response("Connecte-toi pour télécharger cette fiche.", { status: 401 });

  let product;
  try {
    product = await getProduct(supabase, id);
  } catch {
    return new Response("Produit introuvable.", { status: 404 });
  }

  let photo: PdfPhoto = null;
  if (product.photoPath) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).download(product.photoPath);
    if (data) {
      const format = product.photoPath.endsWith(".png") ? "png" : "jpg";
      photo = { data: Buffer.from(await data.arrayBuffer()), format };
    }
  }

  const doc = createElement(TechSheetDocument, { product, photo, generatedAt: new Date() }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(doc);
  const slug =
    product.name
      .replace(/œ/g, "oe")
      .replace(/Œ/g, "OE")
      .replace(/æ/g, "ae")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "produit";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fiche-technique-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
