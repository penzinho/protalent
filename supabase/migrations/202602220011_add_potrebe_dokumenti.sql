begin;

create table if not exists public.potrebe_dokumenti (
  id uuid primary key default gen_random_uuid(),
  klijent_id uuid not null references public.klijenti(id) on delete cascade,
  pozicija_id uuid not null references public.pozicije(id) on delete cascade,
  kandidat_id uuid references public.kandidati(id) on delete set null,
  tip text not null,
  naziv_datoteke text not null,
  mime_type text not null,
  drive_file_id text not null,
  drive_web_view_link text,
  drive_download_link text,
  folder_name text not null,
  is_primary boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint potrebe_dokumenti_tip_check check (tip in ('zivotopis', 'ostalo')),
  constraint potrebe_dokumenti_tip_kandidat_check check (
    (tip = 'zivotopis' and kandidat_id is not null) or
    (tip = 'ostalo' and kandidat_id is null)
  )
);

create unique index if not exists idx_potrebe_dokumenti_primary_cv
  on public.potrebe_dokumenti (pozicija_id, kandidat_id)
  where tip = 'zivotopis' and is_primary = true;

create index if not exists idx_potrebe_dokumenti_pozicija_tip_created
  on public.potrebe_dokumenti (pozicija_id, tip, created_at desc);

create index if not exists idx_potrebe_dokumenti_kandidat_created
  on public.potrebe_dokumenti (kandidat_id, created_at desc);

grant select, insert, update on table public.potrebe_dokumenti to anon, authenticated;

commit;
