-- =====================================================================
-- Prix de revient — schéma initial
-- Chaque utilisateur ne voit et ne modifie que ses propres données (RLS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Paramètres (une ligne par utilisateur)
-- ---------------------------------------------------------------------
create table public.settings (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  margin_threshold numeric(5,2)  not null default 50  check (margin_threshold >= 0 and margin_threshold < 100),
  vat_rate         numeric(5,2)  not null default 20  check (vat_rate >= 0 and vat_rate <= 100),
  wholesale_coef   numeric(6,2)  not null default 2   check (wholesale_coef > 0),
  retail_coef      numeric(6,2)  not null default 2   check (retail_coef > 0),
  currency         text          not null default 'EUR' check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'CAD')),
  fixed_costs      numeric(12,2) not null default 0   check (fixed_costs >= 0),
  updated_at       timestamptz   not null default now()
);

-- ---------------------------------------------------------------------
-- Produits
-- ---------------------------------------------------------------------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 120),
  category         text not null default 'autre'
                   check (category in ('tshirt', 'sweat', 'veste', 'robe', 'pantalon', 'autre')),
  photo_path       text,
  labor_cost       numeric(12,2) not null default 0 check (labor_cost >= 0),
  retail_price_ttc numeric(12,2) check (retail_price_ttc is null or retail_price_ttc >= 0),
  suppliers        text not null default '',
  workshop_notes   text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_user_idx on public.products (user_id, category);

-- Lignes rattachées à un produit. user_id est dupliqué pour une RLS simple.
create table public.product_materials (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null default '',
  price_per_meter numeric(12,2) not null default 0 check (price_per_meter >= 0),
  meters_used    numeric(10,3) not null default 0 check (meters_used >= 0),
  position       int not null default 0
);
create index product_materials_product_idx on public.product_materials (product_id);

create table public.product_accessories (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default '',
  unit_price  numeric(12,3) not null default 0 check (unit_price >= 0),
  quantity    numeric(10,2) not null default 1 check (quantity >= 0),
  position    int not null default 0
);
create index product_accessories_product_idx on public.product_accessories (product_id);

create table public.product_extra_costs (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null default '',
  kind        text not null default 'amount' check (kind in ('amount', 'percent')),
  value       numeric(12,2) not null default 0 check (value >= 0),
  position    int not null default 0
);
create index product_extra_costs_product_idx on public.product_extra_costs (product_id);

create table public.product_sizes (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measure_label text not null default '',
  xs            text not null default '',
  s             text not null default '',
  m             text not null default '',
  l             text not null default '',
  xl            text not null default '',
  position      int not null default 0
);
create index product_sizes_product_idx on public.product_sizes (product_id);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Création des paramètres par défaut à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.settings            enable row level security;
alter table public.products            enable row level security;
alter table public.product_materials   enable row level security;
alter table public.product_accessories enable row level security;
alter table public.product_extra_costs enable row level security;
alter table public.product_sizes       enable row level security;

create policy "settings: propriétaire" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "products: propriétaire" on public.products
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Pour les lignes enfants, on vérifie aussi que le produit appartient
-- à l'utilisateur, pour empêcher de rattacher une ligne au produit d'un autre.
do $$
declare t text;
begin
  foreach t in array array['product_materials', 'product_accessories', 'product_extra_costs', 'product_sizes']
  loop
    execute format($f$
      create policy "%1$s: propriétaire" on public.%1$I
        for all to authenticated
        using ((select auth.uid()) = user_id)
        with check (
          (select auth.uid()) = user_id
          and exists (
            select 1 from public.products p
            where p.id = product_id and p.user_id = (select auth.uid())
          )
        )
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Stockage des photos : bucket privé, un dossier par utilisateur
-- chemin : {user_id}/{product_id}-{horodatage}.{ext}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 5242880,
        array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "photos: lecture propriétaire" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: ajout propriétaire" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: modification propriétaire" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: suppression propriétaire" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
