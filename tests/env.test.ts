import { describe, expect, it } from "vitest";
import { cleanUrl } from "@/lib/supabase/env";

describe("nettoyage des URL d'environnement", () => {
  it("retire le / final et les espaces", () => {
    expect(cleanUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
    expect(cleanUrl(" https://code-outil.vercel.app// ")).toBe("https://code-outil.vercel.app");
    expect(cleanUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });
  it("renvoie undefined si vide", () => {
    expect(cleanUrl("")).toBeUndefined();
    expect(cleanUrl(undefined)).toBeUndefined();
  });
});
