begin;

alter table public.klijenti
  add column if not exists email_ugovori text;

create table if not exists public.ugovori_dokumenti (
  id uuid primary key default gen_random_uuid(),
  klijent_id uuid not null references public.klijenti(id) on delete cascade,
  naziv_datoteke text not null,
  mime_type text not null default 'application/pdf',
  drive_file_id text not null,
  drive_web_view_link text,
  drive_download_link text,
  pozicije_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_ugovori_dokumenti_klijent
  on public.ugovori_dokumenti (klijent_id, created_at desc);

create table if not exists public.app_postavke (
  id smallint primary key,
  smtp_host text not null default '',
  smtp_port integer not null default 587,
  smtp_secure boolean not null default false,
  smtp_username text not null default '',
  smtp_encrypted_password text,
  smtp_from_name text not null default '',
  smtp_from_email text not null default '',
  mail_subject_template text not null default 'Ugovor o suradnji - {{klijent_naziv}}',
  mail_body_template text not null default E'Poštovani,\\n\\nu privitku šaljemo ugovor {{naziv_ugovora}}.\\n\\nLijep pozdrav,',
  drive_root_folder_id text not null default '',
  drive_service_account_encrypted text,
  updated_at timestamptz not null default now(),
  constraint app_postavke_singleton check (id = 1),
  constraint app_postavke_smtp_port_check check (smtp_port between 1 and 65535)
);

insert into public.app_postavke (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.mail_slanje_log (
  id uuid primary key default gen_random_uuid(),
  ugovor_id uuid not null references public.ugovori_dokumenti(id) on delete cascade,
  klijent_id uuid not null references public.klijenti(id) on delete cascade,
  to_email text not null,
  subject text not null,
  status text not null,
  error text,
  created_at timestamptz not null default now(),
  constraint mail_slanje_log_status_check check (status in ('sent', 'failed'))
);

create index if not exists idx_mail_slanje_log_ugovor
  on public.mail_slanje_log (ugovor_id, created_at desc);

create index if not exists idx_mail_slanje_log_klijent
  on public.mail_slanje_log (klijent_id, created_at desc);

grant select, insert on table public.ugovori_dokumenti to anon, authenticated;
grant select, update on table public.app_postavke to anon, authenticated;
grant select, insert on table public.mail_slanje_log to anon, authenticated;

commit;
