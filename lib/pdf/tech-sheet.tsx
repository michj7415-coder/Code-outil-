import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Product } from "../data";
import { categoryLabel } from "../validation/product";

/**
 * Fiche technique destinée à l'atelier. Volontairement sans prix ni marge.
 * Police Helvetica intégrée au PDF : accents, « œ » et « € » sont pris en charge.
 */

// L'espace fine insécable de Intl n'existe pas dans la police PDF standard.
const clean = (s: string) => s.replace(/[  ]/g, " ");
const fmt = (n: number) => clean(n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }));

const ink = "#1c1917";
const muted = "#78716c";
const line = "#e7e5e4";

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: ink, lineHeight: 1.4 },
  header: { flexDirection: "row", gap: 20, marginBottom: 20 },
  photo: { width: 130, height: 165, objectFit: "cover", borderRadius: 4 },
  photoEmpty: { width: 130, height: 165, borderWidth: 1, borderColor: line, borderStyle: "dashed", borderRadius: 4, justifyContent: "center", alignItems: "center" },
  kicker: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginTop: 6, marginBottom: 8 },
  meta: { color: muted },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.6 },
  table: { borderWidth: 1, borderColor: line, borderRadius: 3 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: line },
  trLast: { flexDirection: "row" },
  th: { padding: 5, fontFamily: "Helvetica-Bold", fontSize: 9, backgroundColor: "#f5f5f4" },
  td: { padding: 5 },
  empty: { color: muted, fontStyle: "italic" },
  text: { marginBottom: 2 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: muted },
});

type Col = { label: string; width: string; align?: "left" | "right" | "center" };

function Table({ cols, rows }: { cols: Col[]; rows: string[][] }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: c.width, textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={i === rows.length - 1 ? s.trLast : s.tr} wrap={false}>
          {r.map((cell, j) => (
            <Text key={j} style={[s.td, { width: cols[j].width, textAlign: cols[j].align ?? "left" }]}>
              {clean(cell)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Paragraphs({ text, emptyLabel }: { text: string; emptyLabel: string }) {
  const lines = text.split(/\r?\n/);
  if (!text.trim()) return <Text style={s.empty}>{emptyLabel}</Text>;
  return (
    <View>
      {lines.map((l, i) => (
        <Text key={i} style={s.text}>
          {clean(l) || " "}
        </Text>
      ))}
    </View>
  );
}

export type PdfPhoto = { data: Buffer; format: "png" | "jpg" } | null;

export function TechSheetDocument({ product, photo, generatedAt }: { product: Product; photo: PdfPhoto; generatedAt: Date }) {
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Document title={`Fiche technique — ${product.name}`} author="Prix de revient" language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {photo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas d'attribut alt
            <Image src={photo} style={s.photo} />
          ) : (
            <View style={s.photoEmpty}>
              <Text style={s.meta}>Pas de photo</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Fiche technique</Text>
            <Text style={s.title}>{clean(product.name)}</Text>
            <Text style={s.meta}>Catégorie : {categoryLabel(product.category)}</Text>
          </View>
        </View>

        <Text style={s.h2}>Matières et métrages</Text>
        {product.materials.length === 0 ? (
          <Text style={s.empty}>Aucune matière renseignée.</Text>
        ) : (
          <Table
            cols={[
              { label: "Tissu", width: "75%" },
              { label: "Métrage par pièce", width: "25%", align: "right" },
            ]}
            rows={product.materials.map((m) => [m.name, `${fmt(m.metersUsed)} m`])}
          />
        )}

        <Text style={s.h2}>Accessoires</Text>
        {product.accessories.length === 0 ? (
          <Text style={s.empty}>Aucun accessoire renseigné.</Text>
        ) : (
          <Table
            cols={[
              { label: "Accessoire", width: "75%" },
              { label: "Quantité par pièce", width: "25%", align: "right" },
            ]}
            rows={product.accessories.map((a) => [a.name, fmt(a.quantity)])}
          />
        )}

        <Text style={s.h2}>Tableau de mesures</Text>
        {product.sizes.length === 0 ? (
          <Text style={s.empty}>Aucune mesure renseignée.</Text>
        ) : (
          <Table
            cols={[
              { label: "Mesure", width: "35%" },
              ...(["XS", "S", "M", "L", "XL"] as const).map((l) => ({ label: l, width: "13%", align: "center" as const })),
            ]}
            rows={product.sizes.map((r) => [r.measureLabel, r.xs, r.s, r.m, r.l, r.xl])}
          />
        )}

        <View wrap={false}>
          <Text style={s.h2}>Fournisseurs</Text>
          <Paragraphs text={product.suppliers} emptyLabel="Aucun fournisseur renseigné." />
        </View>

        <View>
          <Text style={s.h2}>Consignes pour l&apos;atelier</Text>
          <Paragraphs text={product.workshopNotes} emptyLabel="Aucune consigne." />
        </View>

        <View style={s.footer} fixed>
          <Text>
            {clean(product.name)} · édité le {date}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
