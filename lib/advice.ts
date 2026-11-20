/**
 * Conseils sur les prix — fonctions pures.
 * Chaque conseil est accompagné d'une explication : ce sont des repères, pas des vérités.
 */
import { formatMoney, formatPercent, median, round2, htToTtc, type PricingResult, type PricingSettings } from "./pricing";

export const FABRIC_SHARE_ALERT = 50; // % du coût de revient
export const CATEGORY_GAP_ALERT = 40; // % d'écart avec la médiane de la catégorie
export const CATEGORY_MIN_PEERS = 2;

export const ADVICE_DISCLAIMER =
  "Ces conseils sont des repères de calcul, pas des vérités : ton positionnement, ta clientèle et tes canaux de vente comptent autant que les chiffres.";

export type PeerPrice = { id: string; category: string; priceTtc: number };

export type Advice = {
  id: "prix-conseille" | "marge" | "tissu" | "categorie" | "prix-absent";
  tone: "info" | "ok" | "warn";
  /** le constat (le problème ou le repère) */
  title: string;
  /** pourquoi c'est important, chiffres à l'appui */
  why: string;
  /** que faire concrètement */
  action: string;
};

export type AdviceContext = {
  pricing: PricingResult;
  settings: PricingSettings;
  currency: string;
  category: string;
  categoryLabel: string;
  productId?: string;
  peers: PeerPrice[];
};

const pct = (n: number) => formatPercent(n, 0);
const coef = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function buildAdvice(ctx: AdviceContext): Advice[] {
  const { pricing, settings, currency } = ctx;
  const money = (n: number) => formatMoney(n, currency);
  const cost = pricing.cost.total;
  const out: Advice[] = [];

  if (!(cost > 0)) {
    return [
      {
        id: "prix-conseille",
        tone: "info",
        title: "Saisis tes coûts pour obtenir des conseils",
        why: "Sans coût de revient, impossible de calculer un prix conseillé ni une marge.",
        action: "Ajoute au moins un tissu et la main-d'œuvre : les conseils apparaîtront au fur et à mesure.",
      },
    ];
  }

  // 1. Prix conseillé
  const s = pricing.suggested;
  out.push({
    id: "prix-conseille",
    tone: "info",
    title: `Prix public conseillé : ${money(s.retailTtc)} TTC`,
    why:
      `Ton coût de revient est de ${money(cost)}. Multiplié par ${coef(settings.wholesaleCoef)} (coefficient de gros), ` +
      `il donne un prix de gros de ${money(s.wholesaleHt)} HT : le prix auquel une boutique t'achèterait la pièce. ` +
      `Multiplié par ${coef(settings.retailCoef)} (coefficient de détail), on obtient ${money(s.retailHt)} HT, ` +
      `soit ${money(s.retailTtc)} TTC avec ${pct(settings.vatRate)} de TVA. ` +
      `C'est la règle courante dans la mode : elle laisse de la marge à toi et à tes revendeurs.`,
    action: "Pars de ce prix, puis ajuste-le selon ton positionnement et les prix pratiqués par des marques comparables.",
  });

  if (pricing.usesSuggestedPrice) {
    out.push({
      id: "prix-absent",
      tone: "info",
      title: "Tu n'as pas encore fixé ton prix",
      why: "En attendant, la marge affichée est calculée sur le prix conseillé, pas sur ton vrai prix.",
      action: "Saisis ton prix public TTC dans « Ton prix de vente » pour voir ta marge réelle.",
    });
  }

  // 2. Marge sous le seuil
  const rate = pricing.marginRate;
  if (rate != null) {
    const threshold = settings.marginThreshold;
    if (rate < threshold) {
      const minHt = round2(cost / (1 - threshold / 100));
      const maxCost = round2(pricing.priceHt * (1 - threshold / 100));
      const loss = pricing.marginAmount < 0;
      out.push({
        id: "marge",
        tone: "warn",
        title: loss
          ? `Tu vends à perte : ${money(-pricing.marginAmount)} perdus par pièce`
          : `Marge de ${pct(rate)}, sous ton seuil de ${pct(threshold)}`,
        why:
          `Sur un prix de ${money(pricing.priceHt)} HT, il te reste ${money(pricing.marginAmount)} par pièce une fois le coût de revient payé. ` +
          `Cette marge doit encore payer tes frais fixes (site, salons, photos, ton salaire).`,
        action:
          `Pour atteindre ${pct(threshold)} de marge, vends au moins ${money(htToTtc(minHt, settings.vatRate))} TTC, ` +
          `ou fais baisser ton coût de revient à ${money(Math.max(0, maxCost))} maximum (tissu, façon, accessoires).`,
      });
    } else {
      out.push({
        id: "marge",
        tone: "ok",
        title: `Marge de ${pct(rate)}, au-dessus de ton seuil de ${pct(threshold)}`,
        why: `Il te reste ${money(pricing.marginAmount)} par pièce vendue ${money(pricing.priceHt)} HT, pour couvrir tes frais fixes et te rémunérer.`,
        action: "Garde ce cap. Vérifie dans le simulateur ce que donnerait une hausse du prix du tissu.",
      });
    }
  }

  // 3. Poids du tissu
  const share = pricing.fabricShare;
  if (share != null && share > FABRIC_SHARE_ALERT) {
    out.push({
      id: "tissu",
      tone: "warn",
      title: `Ton tissu représente ${pct(share)} du coût`,
      why:
        `Au-delà de ${pct(FABRIC_SHARE_ALERT)}, ton prix dépend surtout du tissu : une hausse de 10 % de son prix ` +
        `augmenterait ton coût de revient de ${money(round2(pricing.cost.materials * 0.1))}.`,
      action: "Négocie un prix au volume, optimise le placement pour réduire le métrage, ou compare d'autres fournisseurs.",
    });
  }

  // 4. Cohérence avec les autres produits de la même catégorie
  const others = ctx.peers.filter((p) => p.category === ctx.category && p.id !== ctx.productId && p.priceTtc > 0);
  const med = others.length >= CATEGORY_MIN_PEERS ? median(others.map((p) => p.priceTtc)) : null;
  if (med != null && med > 0) {
    const gap = round2(((pricing.priceTtc - med) / med) * 100);
    if (Math.abs(gap) > CATEGORY_GAP_ALERT) {
      const label = ctx.categoryLabel.toLowerCase();
      out.push({
        id: "categorie",
        tone: "warn",
        title: `Prix ${pct(Math.abs(gap))} ${gap > 0 ? "au-dessus" : "en dessous"} de tes autres produits « ${label} »`,
        why:
          `Tes ${others.length} autres produits de cette catégorie sont vendus autour de ${money(med)} TTC (prix médian), ` +
          `contre ${money(pricing.priceTtc)} ici. Un écart important peut brouiller la lecture de ta gamme.`,
        action:
          `Si l'écart est voulu (matière plus noble, finitions, édition limitée), assume-le et explique-le à tes clients ; ` +
          `sinon, rapproche ton prix de ${money(med)}.`,
      });
    }
  }

  return out;
}
