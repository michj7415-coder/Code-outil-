import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/data";
import { TechSheetDocument } from "@/lib/pdf/tech-sheet";

const product: Product = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Robe Élise — œillets",
  category: "robe",
  photoPath: null,
  retailPriceTtc: 149,
  laborCost: 35,
  suppliers: "Crêpe de soie : Maison Dupont\nŒillets : Mercerie Martin",
  workshopNotes: "Ourlet invisible 2 cm.",
  updatedAt: new Date().toISOString(),
  materials: [{ name: "Crêpe de soie", pricePerMeter: 42, metersUsed: 2.25 }],
  accessories: [{ name: "Œillets métal", unitPrice: 0.2, quantity: 12 }],
  extraCosts: [],
  sizes: [{ measureLabel: "Tour de taille", xs: "62", s: "66", m: "70", l: "74", xl: "78" }],
};

describe("fiche technique PDF", () => {
  it("génère un PDF valide, avec ou sans données", async () => {
    for (const p of [product, { ...product, materials: [], accessories: [], sizes: [], suppliers: "", workshopNotes: "" }]) {
      const doc = createElement(TechSheetDocument, { product: p, photo: null, generatedAt: new Date(2026, 10, 19) });
      const buf = await renderToBuffer(doc as unknown as ReactElement<DocumentProps>);
      expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buf.length).toBeGreaterThan(1000);
    }
  }, 20000);
});
