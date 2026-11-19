import "server-only";
import { cache } from "react";
import { getProduct, getSettings, listProducts, signedPhotoUrls } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

/** Chargements partagés entre le layout et les onglets d'un produit (une seule requête par rendu). */
export const loadProduct = cache(async (id: string) => {
  const { supabase, userId } = await requireUser();
  const [product, settings] = await Promise.all([getProduct(supabase, id), getSettings(supabase, userId)]);
  const photos = await signedPhotoUrls(supabase, [product.photoPath]);
  return { product, settings, photoUrl: product.photoPath ? (photos[product.photoPath] ?? null) : null };
});

export const loadAllProducts = cache(async () => {
  const { supabase } = await requireUser();
  return listProducts(supabase);
});
