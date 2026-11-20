-- =====================================================================
-- Droits d'accès explicites pour les utilisateurs connectés.
-- Les projets Supabase récents n'exposent plus automatiquement les
-- nouvelles tables à l'API : sans ces droits, l'application reçoit
-- « permission denied for table … » (code 42501).
-- La Row Level Security (0001) continue de limiter chaque utilisateur
-- à ses propres lignes. Le rôle anon (non connecté) n'a aucun droit.
-- Ce fichier peut être exécuté plusieurs fois sans risque.
-- =====================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.settings,
  public.products,
  public.product_materials,
  public.product_accessories,
  public.product_extra_costs,
  public.product_sizes
to authenticated;

revoke all on table
  public.settings,
  public.products,
  public.product_materials,
  public.product_accessories,
  public.product_extra_costs,
  public.product_sizes
from anon;

grant execute on function public.save_product(uuid, jsonb) to authenticated;
grant execute on function public.save_tech_sheet(uuid, jsonb) to authenticated;
grant execute on function public.duplicate_product(uuid, text) to authenticated;
