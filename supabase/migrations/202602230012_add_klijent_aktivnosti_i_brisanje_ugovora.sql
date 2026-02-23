begin;

create table if not exists public.klijent_aktivnosti (
  id uuid primary key default gen_random_uuid(),
  klijent_id uuid not null references public.klijenti(id) on delete cascade,
  akcija text not null,
  opis text not null,
  source_type text not null,
  source_id text not null,
  user_label text not null default 'Sustav',
  metadata jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now(),
  constraint klijent_aktivnosti_akcija_check check (
    akcija in (
      'KLIJENT_DODAN',
      'POTREBA_DODANA',
      'UGOVOR_GENERIRAN',
      'UGOVOR_POSLAN',
      'UGOVOR_OBRISAN'
    )
  ),
  constraint klijent_aktivnosti_source_unique unique (source_type, source_id)
);

create index if not exists idx_klijent_aktivnosti_klijent_event
  on public.klijent_aktivnosti (klijent_id, event_at desc);

create or replace function public.current_aktivnost_user_label()
returns text
language plpgsql
stable
as $$
declare
  jwt_email text;
  claim_email text;
begin
  begin
    jwt_email := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');
  exception when others then
    jwt_email := null;
  end;

  claim_email := nullif(trim(coalesce(current_setting('request.jwt.claim.email', true), '')), '');

  return coalesce(jwt_email, claim_email, 'Sustav');
end;
$$;

create or replace function public.upisi_klijent_aktivnost(
  p_klijent_id uuid,
  p_akcija text,
  p_opis text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_event_at timestamptz default now()
)
returns void
language plpgsql
as $$
begin
  insert into public.klijent_aktivnosti (
    klijent_id,
    akcija,
    opis,
    source_type,
    source_id,
    user_label,
    metadata,
    event_at
  )
  values (
    p_klijent_id,
    p_akcija,
    p_opis,
    p_source_type,
    p_source_id,
    public.current_aktivnost_user_label(),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_event_at, now())
  )
  on conflict (source_type, source_id) do nothing;
end;
$$;

create or replace function public.trg_log_klijent_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.upisi_klijent_aktivnost(
    new.id,
    'KLIJENT_DODAN',
    'Dodan klijent: ' || coalesce(new.naziv_tvrtke, 'Nepoznati klijent'),
    'klijent_insert',
    new.id::text,
    jsonb_build_object('naziv_tvrtke', new.naziv_tvrtke),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.trg_log_pozicija_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.upisi_klijent_aktivnost(
    new.klijent_id,
    'POTREBA_DODANA',
    'Unesena potreba: ' || coalesce(new.naziv_pozicije, 'Nepoznata potreba'),
    'pozicija_insert',
    new.id::text,
    jsonb_build_object('naziv_pozicije', new.naziv_pozicije),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.trg_log_ugovor_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.upisi_klijent_aktivnost(
    new.klijent_id,
    'UGOVOR_GENERIRAN',
    'Generiran ugovor: ' || coalesce(new.naziv_datoteke, 'Nepoznati ugovor'),
    'ugovor_insert',
    new.id::text,
    jsonb_build_object('naziv_datoteke', new.naziv_datoteke),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.trg_log_mail_slanje_sent()
returns trigger
language plpgsql
as $$
declare
  v_naziv_ugovora text;
begin
  if lower(coalesce(new.status, '')) <> 'sent' then
    return new;
  end if;

  select u.naziv_datoteke
    into v_naziv_ugovora
  from public.ugovori_dokumenti u
  where u.id = new.ugovor_id;

  perform public.upisi_klijent_aktivnost(
    new.klijent_id,
    'UGOVOR_POSLAN',
    'Poslan ugovor: ' || coalesce(v_naziv_ugovora, new.subject, 'Ugovor'),
    'mail_slanje_sent',
    new.id::text,
    jsonb_build_object(
      'to_email', new.to_email,
      'subject', new.subject,
      'ugovor_id', new.ugovor_id
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.trg_log_ugovor_delete()
returns trigger
language plpgsql
as $$
begin
  perform public.upisi_klijent_aktivnost(
    old.klijent_id,
    'UGOVOR_OBRISAN',
    'Obrisan ugovor: ' || coalesce(old.naziv_datoteke, 'Nepoznati ugovor'),
    'ugovor_delete',
    old.id::text,
    jsonb_build_object('naziv_datoteke', old.naziv_datoteke),
    now()
  );

  return old;
end;
$$;

drop trigger if exists trg_klijent_aktivnost_after_klijent_insert on public.klijenti;
create trigger trg_klijent_aktivnost_after_klijent_insert
after insert on public.klijenti
for each row
execute function public.trg_log_klijent_insert();

drop trigger if exists trg_klijent_aktivnost_after_pozicija_insert on public.pozicije;
create trigger trg_klijent_aktivnost_after_pozicija_insert
after insert on public.pozicije
for each row
execute function public.trg_log_pozicija_insert();

drop trigger if exists trg_klijent_aktivnost_after_ugovor_insert on public.ugovori_dokumenti;
create trigger trg_klijent_aktivnost_after_ugovor_insert
after insert on public.ugovori_dokumenti
for each row
execute function public.trg_log_ugovor_insert();

drop trigger if exists trg_klijent_aktivnost_after_mail_sent on public.mail_slanje_log;
create trigger trg_klijent_aktivnost_after_mail_sent
after insert on public.mail_slanje_log
for each row
execute function public.trg_log_mail_slanje_sent();

drop trigger if exists trg_klijent_aktivnost_after_ugovor_delete on public.ugovori_dokumenti;
create trigger trg_klijent_aktivnost_after_ugovor_delete
after delete on public.ugovori_dokumenti
for each row
execute function public.trg_log_ugovor_delete();

insert into public.klijent_aktivnosti (
  klijent_id,
  akcija,
  opis,
  source_type,
  source_id,
  user_label,
  metadata,
  event_at
)
select
  k.id,
  'KLIJENT_DODAN',
  'Dodan klijent: ' || coalesce(k.naziv_tvrtke, 'Nepoznati klijent'),
  'klijent_insert',
  k.id::text,
  'Sustav',
  jsonb_build_object('naziv_tvrtke', k.naziv_tvrtke),
  coalesce(k.created_at, now())
from public.klijenti k
on conflict (source_type, source_id) do nothing;

insert into public.klijent_aktivnosti (
  klijent_id,
  akcija,
  opis,
  source_type,
  source_id,
  user_label,
  metadata,
  event_at
)
select
  p.klijent_id,
  'POTREBA_DODANA',
  'Unesena potreba: ' || coalesce(p.naziv_pozicije, 'Nepoznata potreba'),
  'pozicija_insert',
  p.id::text,
  'Sustav',
  jsonb_build_object('naziv_pozicije', p.naziv_pozicije),
  coalesce(p.created_at, now())
from public.pozicije p
on conflict (source_type, source_id) do nothing;

insert into public.klijent_aktivnosti (
  klijent_id,
  akcija,
  opis,
  source_type,
  source_id,
  user_label,
  metadata,
  event_at
)
select
  u.klijent_id,
  'UGOVOR_GENERIRAN',
  'Generiran ugovor: ' || coalesce(u.naziv_datoteke, 'Nepoznati ugovor'),
  'ugovor_insert',
  u.id::text,
  'Sustav',
  jsonb_build_object('naziv_datoteke', u.naziv_datoteke),
  coalesce(u.created_at, now())
from public.ugovori_dokumenti u
on conflict (source_type, source_id) do nothing;

insert into public.klijent_aktivnosti (
  klijent_id,
  akcija,
  opis,
  source_type,
  source_id,
  user_label,
  metadata,
  event_at
)
select
  m.klijent_id,
  'UGOVOR_POSLAN',
  'Poslan ugovor: ' || coalesce(u.naziv_datoteke, m.subject, 'Ugovor'),
  'mail_slanje_sent',
  m.id::text,
  'Sustav',
  jsonb_build_object(
    'to_email', m.to_email,
    'subject', m.subject,
    'ugovor_id', m.ugovor_id
  ),
  coalesce(m.created_at, now())
from public.mail_slanje_log m
left join public.ugovori_dokumenti u on u.id = m.ugovor_id
where lower(coalesce(m.status, '')) = 'sent'
on conflict (source_type, source_id) do nothing;

grant select, insert on table public.klijent_aktivnosti to anon, authenticated;
grant delete on table public.ugovori_dokumenti to anon, authenticated;

commit;
