begin;

create table if not exists public.ugovori_dokumenti_lokacije (
  id uuid primary key default gen_random_uuid(),
  ugovor_id uuid not null references public.ugovori_dokumenti(id) on delete cascade,
  pozicija_id uuid not null references public.pozicije(id) on delete cascade,
  datum_upisa date,
  drive_file_id text not null,
  drive_web_view_link text,
  drive_download_link text,
  folder_name text not null,
  created_at timestamptz not null default now(),
  constraint ugovori_dokumenti_lokacije_unique_ugovor_pozicija unique (ugovor_id, pozicija_id)
);

create index if not exists idx_ugovori_dokumenti_lokacije_ugovor
  on public.ugovori_dokumenti_lokacije (ugovor_id, created_at desc);

create index if not exists idx_ugovori_dokumenti_lokacije_pozicija
  on public.ugovori_dokumenti_lokacije (pozicija_id, created_at desc);

grant select, insert on table public.ugovori_dokumenti_lokacije to anon, authenticated;

commit;
