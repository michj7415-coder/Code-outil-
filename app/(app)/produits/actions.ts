"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/data";
import { describeDbError } from "@/lib/setup-check";
import { productSchema, techSheetSchema, validatePhoto } from "@/lib/validation/product";
import { toFieldErrors, type FormState } from "@/lib/validation/form";

function parsePayload(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return {};
  }
}

function photoExtension(type: string) {
  return type === "image/png" ? "png" : "jpg";
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const id = (formData.get("id") as string) || null;

  const parsed = productSchema.safeParse(parsePayload(formData));
  if (!parsed.success) {
    return { error: "Certains champs sont à corriger.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const photo = formData.get("photo");
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
  const photoError = validatePhoto(photoFile);
  if (photoError) return { error: photoError, fieldErrors: { photo: photoError } };

  const { data: productId, error } = await supabase.rpc("save_product", { p_id: id, p: parsed.data });
  if (error || !productId) {
    return { error: `L'enregistrement a échoué. ${describeDbError(error)}` };
  }

  // Photo : remplacement ou suppression
  const removePhoto = formData.get("removePhoto") === "1";
  if (photoFile || removePhoto) {
    const { data: current } = await supabase.from("products").select("photo_path").eq("id", productId).single();
    let newPath: string | null = null;
    if (photoFile) {
      newPath = `${userId}/${productId}-${Date.now()}.${photoExtension(photoFile.type)}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(newPath, photoFile, { contentType: photoFile.type, upsert: false });
      if (upErr) {
        revalidatePath("/produits");
        return { error: "Le produit est enregistré, mais l'envoi de la photo a échoué. Réessaie." };
      }
    }
    await supabase.from("products").update({ photo_path: newPath }).eq("id", productId);
    if (current?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([current.photo_path]);
  }

  revalidatePath("/produits");
  if (!id) redirect(`/produits/${productId}?cree=1`);
  revalidatePath(`/produits/${productId}`);
  return { message: "Produit enregistré." };
}

export async function saveTechSheet(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = techSheetSchema.safeParse(parsePayload(formData));
  if (!parsed.success) {
    return { error: "Certains champs sont à corriger.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { error } = await supabase.rpc("save_tech_sheet", { p_id: id, p: parsed.data });
  if (error) return { error: `L'enregistrement a échoué. ${describeDbError(error)}` };
  revalidatePath(`/produits/${id}`, "layout");
  return { message: "Fiche technique enregistrée." };
}

export async function duplicateProduct(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const id = String(formData.get("id") ?? "");

  const { data: source } = await supabase.from("products").select("photo_path").eq("id", id).maybeSingle();
  if (!source) redirect("/produits");

  // La copie a sa propre photo, pour que supprimer l'une n'efface pas l'autre.
  let photoCopy: string | null = null;
  if (source.photo_path) {
    const ext = source.photo_path.split(".").pop() ?? "jpg";
    const target = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).copy(source.photo_path, target);
    if (!error) photoCopy = target;
  }

  const { data: newId, error } = await supabase.rpc("duplicate_product", { p_id: id, p_photo_path: photoCopy });
  if (error || !newId) {
    if (photoCopy) await supabase.storage.from(PHOTO_BUCKET).remove([photoCopy]);
    redirect("/produits?erreur=duplication");
  }
  revalidatePath("/produits");
  redirect(`/produits/${newId}?copie=1`);
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const { data } = await supabase.from("products").delete().eq("id", id).select("photo_path").maybeSingle();
  if (data?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([data.photo_path]);
  revalidatePath("/produits");
  redirect("/produits");
}
