-- =====================================================================
-- Enregistrement atomique d'un produit et de ses lignes.
-- security invoker : les fonctions s'exécutent avec les droits de
-- l'utilisateur, la RLS s'applique donc normalement.
-- =====================================================================

-- Crée (p_id null) ou met à jour un produit et remplace ses matières,
-- accessoires et frais. Renvoie l'id du produit.
create or replace function public.save_product(p_id uuid, p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if v_id is null then
    insert into products (name, category, labor_cost, retail_price_ttc)
    values (p->>'name', p->>'category', (p->>'laborCost')::numeric, (p->>'retailPriceTtc')::numeric)
    returning id into v_id;
  else
    update products set
      name = p->>'name',
      category = p->>'category',
      labor_cost = (p->>'laborCost')::numeric,
      retail_price_ttc = (p->>'retailPriceTtc')::numeric
    where id = v_id;
    if not found then
      raise exception 'Produit introuvable' using errcode = 'P0002';
    end if;
    delete from product_materials where product_id = v_id;
    delete from product_accessories where product_id = v_id;
    delete from product_extra_costs where product_id = v_id;
  end if;

  insert into product_materials (product_id, name, price_per_meter, meters_used, position)
  select v_id, e->>'name', (e->>'pricePerMeter')::numeric, (e->>'metersUsed')::numeric, (o - 1)::int
  from jsonb_array_elements(coalesce(p->'materials', '[]')) with ordinality as t(e, o);

  insert into product_accessories (product_id, name, unit_price, quantity, position)
  select v_id, e->>'name', (e->>'unitPrice')::numeric, (e->>'quantity')::numeric, (o - 1)::int
  from jsonb_array_elements(coalesce(p->'accessories', '[]')) with ordinality as t(e, o);

  insert into product_extra_costs (product_id, label, kind, value, position)
  select v_id, e->>'label', e->>'kind', (e->>'value')::numeric, (o - 1)::int
  from jsonb_array_elements(coalesce(p->'extraCosts', '[]')) with ordinality as t(e, o);

  return v_id;
end $$;

-- Met à jour la fiche technique : fournisseurs, consignes et tableau de mesures.
create or replace function public.save_tech_sheet(p_id uuid, p jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update products set
    suppliers = coalesce(p->>'suppliers', ''),
    workshop_notes = coalesce(p->>'workshopNotes', '')
  where id = p_id;
  if not found then
    raise exception 'Produit introuvable' using errcode = 'P0002';
  end if;

  delete from product_sizes where product_id = p_id;
  insert into product_sizes (product_id, measure_label, xs, s, m, l, xl, position)
  select p_id, e->>'measureLabel', coalesce(e->>'xs', ''), coalesce(e->>'s', ''), coalesce(e->>'m', ''),
         coalesce(e->>'l', ''), coalesce(e->>'xl', ''), (o - 1)::int
  from jsonb_array_elements(coalesce(p->'sizes', '[]')) with ordinality as t(e, o);
end $$;

-- Duplique un produit et toutes ses lignes. La photo est copiée côté
-- application (Storage) puis enregistrée via p_photo_path.
create or replace function public.duplicate_product(p_id uuid, p_photo_path text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new uuid;
begin
  insert into products (name, category, photo_path, labor_cost, retail_price_ttc, suppliers, workshop_notes)
  select left(name || ' (copie)', 120), category, p_photo_path, labor_cost, retail_price_ttc, suppliers, workshop_notes
  from products where id = p_id
  returning id into v_new;
  if v_new is null then
    raise exception 'Produit introuvable' using errcode = 'P0002';
  end if;

  insert into product_materials (product_id, name, price_per_meter, meters_used, position)
  select v_new, name, price_per_meter, meters_used, position from product_materials where product_id = p_id;
  insert into product_accessories (product_id, name, unit_price, quantity, position)
  select v_new, name, unit_price, quantity, position from product_accessories where product_id = p_id;
  insert into product_extra_costs (product_id, label, kind, value, position)
  select v_new, label, kind, value, position from product_extra_costs where product_id = p_id;
  insert into product_sizes (product_id, measure_label, xs, s, m, l, xl, position)
  select v_new, measure_label, xs, s, m, l, xl, position from product_sizes where product_id = p_id;

  return v_new;
end $$;

revoke execute on function public.save_product(uuid, jsonb) from public, anon;
revoke execute on function public.save_tech_sheet(uuid, jsonb) from public, anon;
revoke execute on function public.duplicate_product(uuid, text) from public, anon;
grant execute on function public.save_product(uuid, jsonb) to authenticated;
grant execute on function public.save_tech_sheet(uuid, jsonb) to authenticated;
grant execute on function public.duplicate_product(uuid, text) to authenticated;
