# Prix de revient

Application web pour les créateurs de marques de vêtements : calcul du prix de revient, conseils sur le prix de vente, simulateur de scénarios et fiche technique PDF pour l'atelier.

## Fonctionnalités

- **Compte** : inscription et connexion par email et mot de passe. Chaque utilisateur ne voit que ses données (Row Level Security).
- **Produits** : liste avec coût de revient, prix de vente et marge. Boutons « Nouveau produit », « Dupliquer » et « Supprimer ».
- **Fiche produit** : nom, photo, catégorie, matières (prix au mètre × métrage), accessoires (prix × quantité), main-d'œuvre et autres frais (en € ou en %). Le résultat se met à jour pendant la saisie.
- **Conseils expliqués** : prix de gros et prix public conseillés, alerte de marge sous le seuil, alerte si le tissu dépasse 50 % du coût, comparaison avec les autres produits de la même catégorie. Ces conseils restent des repères, pas des vérités.
- **Simulateur** : variation du prix du tissu, de la main-d'œuvre ou du prix de vente. Affiche la nouvelle marge et le seuil de rentabilité.
- **Fiche technique PDF** : photo, catégorie, matières et métrages, accessoires, tableau de mesures XS à XL, fournisseurs et consignes. Elle ne contient aucun prix, car elle est destinée à l'atelier.
- **Paramètres** : seuil de marge, TVA, coefficients de gros et de détail, devise et frais fixes par défaut.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Auth, PostgreSQL, Storage), zod, @react-pdf/renderer et Vitest.

## Installation

Prérequis : Node.js 20 ou plus récent, et un compte [Supabase](https://supabase.com) (gratuit).

```bash
npm install
cp .env.example .env.local   # puis renseigne les variables (voir ci-dessous)
```

### 1. Créer le projet Supabase

1. Sur [supabase.com/dashboard](https://supabase.com/dashboard), clique sur **New project**. Choisis une région proche de tes utilisateurs, par exemple Paris (eu-west-3).
2. Crée les tables, les règles de sécurité et le stockage des photos. Deux méthodes possibles :
   - **Sans outil** : dans **SQL Editor**, colle puis exécute, **dans cet ordre** et chacun dans une nouvelle requête, le contenu de :
     1. `supabase/migrations/0001_init.sql` (tables, sécurité, stockage des photos) ;
     2. `supabase/migrations/0002_product_functions.sql` (fonctions d'enregistrement) ;
     3. `supabase/migrations/0003_grants.sql` (droits d'accès ; indispensable sur les projets récents, sinon erreur « permission denied », code 42501).
   - **Avec la CLI Supabase** :
     ```bash
     npx supabase login
     npx supabase link --project-ref <id-du-projet>
     npx supabase db push
     ```
3. Dans **Authentication → URL Configuration** :
   - **Site URL** : `http://localhost:3000` en développement, puis l'URL de production ;
   - **Redirect URLs** : ajoute `http://localhost:3000/auth/callback`, puis l'équivalent en production.
4. Dans **Authentication → Sign In / Providers → Email**, tu choisis si les utilisateurs doivent confirmer leur email. C'est activé par défaut, ce qui est recommandé en production. L'application gère les deux cas.
5. Dans **Project Settings → API Keys**, récupère l'**URL du projet** et la **Publishable key**. L'ancienne clé `anon` fonctionne aussi.

### 2. Variables d'environnement

Elles sont documentées dans `.env.example` :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique du projet, faite pour être utilisée dans le navigateur. La sécurité repose sur la RLS. |
| `NEXT_PUBLIC_SITE_URL` | URL de l'application, utilisée dans le lien de confirmation d'email |

L'application n'a besoin d'**aucune clé secrète** (`service_role` ou `sb_secret_…`). Ne la mets jamais dans `.env.local`. Le fichier `.env.local` est ignoré par git.

### 3. Lancer l'application

```bash
npm run dev      # http://localhost:3000
```

### Variante : Supabase en local (Docker)

```bash
npx supabase start   # applique les migrations automatiquement
```

La commande affiche une `API_URL` et une `PUBLISHABLE_KEY` à copier dans `.env.local`. Les emails de test (confirmation) sont visibles sur http://127.0.0.1:54324. En local, la confirmation d'email est désactivée par défaut (`supabase/config.toml`).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | build et serveur de production |
| `npm test` | tests unitaires (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |

## Calculs

Toutes les formules sont des fonctions pures, testées dans `tests/` :

- `lib/pricing.ts` : prix de revient, prix conseillés, marge et seuil de rentabilité ;
- `lib/advice.ts` : conseils et leurs explications ;
- `lib/simulator.ts` : scénarios.

Les formules :

- **Prix de revient** = Σ (prix au mètre × métrage) + Σ (prix unitaire × quantité) + main-d'œuvre + autres frais. Un frais en % s'applique au sous-total matières + accessoires + main-d'œuvre.
- **Prix de gros conseillé HT** = coût de revient × coefficient de gros (2 par défaut).
- **Prix public conseillé HT** = prix de gros × coefficient de détail (2 par défaut). Le prix **TTC** ajoute la TVA (20 % par défaut).
- **Prix de vente** : le créateur saisit un **prix public TTC**, que l'application convertit en HT. S'il n'en saisit pas, elle utilise le prix conseillé.
- **Marge réelle** = (prix de vente HT − coût de revient) / prix de vente HT. C'est le taux de marque.
- **Seuil de rentabilité** = ⌈ frais fixes / (prix de vente HT − coût de revient) ⌉ pièces.
- **Alertes** :
  - marge sous le seuil (50 % par défaut) ;
  - tissu au-dessus de 50 % du coût ;
  - prix à plus de ±40 % de la médiane des autres produits de la même catégorie. Cette comparaison demande au moins 2 autres produits dans la catégorie.

## Structure

```
app/
  (auth)/connexion, (auth)/inscription   pages de connexion et d'inscription
  auth/callback                          confirmation de l'email
  (app)/produits                         liste, nouveau produit
  (app)/produits/[id]                    coûts et prix, simulateur, fiche technique, pdf
  (app)/parametres                       paramètres
components/                              composants d'interface
lib/                                     calculs, validation (zod), accès aux données, PDF
proxy.ts                                 rafraîchit la session et protège les pages
supabase/migrations                      schéma, RLS, stockage, fonctions SQL
tests/                                   tests unitaires
```

## Données et sécurité

- Tables : `settings`, `products`, `product_materials`, `product_accessories`, `product_extra_costs` et `product_sizes`. Les fournisseurs sont saisis en texte libre sur le produit.
- La RLS est active sur toutes les tables : un utilisateur ne lit et n'écrit que ses lignes. Une ligne enfant (matière, accessoire…) ne peut être rattachée qu'à un produit de l'utilisateur.
- Les droits d'accès des utilisateurs connectés sont donnés explicitement (`0003_grants.sql`) ; le rôle `anon` n'a aucun droit sur les tables.
- Les fonctions SQL `save_product`, `save_tech_sheet` et `duplicate_product` enregistrent un produit et ses lignes en une seule transaction. Elles s'exécutent avec les droits de l'utilisateur (`security invoker`), donc la RLS s'applique.
- Les photos sont rangées dans un bucket **privé** (`product-photos`), avec un dossier par utilisateur. Elles sont affichées par URL signée (valable 1 h). Formats acceptés : JPG et PNG, 5 Mo maximum.
