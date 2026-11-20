-- =====================================================================
-- Avis des utilisateurs (« Donner mon avis ») : une note de 1 à 5 et
-- une réponse libre. Chaque utilisateur peut seulement AJOUTER ses avis :
-- il ne peut ni les relire, ni les modifier, ni voir ceux des autres.
-- Le propriétaire de l'application les consulte dans Supabase
-- (Table Editor → feedback).
-- =====================================================================

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  message    text not null default '' check (char_length(message) <= 2000),
  page       text not null default '' check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback: ajout par son auteur" on public.feedback;
create policy "feedback: ajout par son auteur" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Droits explicites (les projets récents ne les donnent plus par défaut).
revoke all on table public.feedback from anon, authenticated;
grant insert on table public.feedback to authenticated;
