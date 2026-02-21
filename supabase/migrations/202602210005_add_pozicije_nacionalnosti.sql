begin;

create table if not exists public.nacionalnosti_radnika (
  id uuid primary key default gen_random_uuid(),
  naziv text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists nacionalnosti_radnika_naziv_unique_lower
  on public.nacionalnosti_radnika (lower(btrim(naziv)));

insert into public.nacionalnosti_radnika (naziv)
values
  ('Filipini'),
  ('Nepal'),
  ('Egipat'),
  ('Bosna i Hercegovina'),
  ('Uzbekistan'),
  ('Indija'),
  ('Bangladeš'),
  ('Pakistan'),
  ('Tajland')
on conflict do nothing;

create table if not exists public.pozicije_nacionalnosti (
  pozicija_id uuid not null references public.pozicije(id) on delete cascade,
  nacionalnost_id uuid not null references public.nacionalnosti_radnika(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (pozicija_id, nacionalnost_id)
);

create index if not exists idx_pozicije_nacionalnosti_nacionalnost_id
  on public.pozicije_nacionalnosti (nacionalnost_id);

grant select, insert on table public.nacionalnosti_radnika to anon, authenticated;
grant select, insert, delete on table public.pozicije_nacionalnosti to anon, authenticated;

commit;
