begin;

alter table public.klijent_aktivnosti
  drop constraint if exists klijent_aktivnosti_akcija_check;

alter table public.klijent_aktivnosti
  add constraint klijent_aktivnosti_akcija_check check (
    akcija in (
      'KLIJENT_DODAN',
      'POTREBA_DODANA',
      'UGOVOR_GENERIRAN',
      'UGOVOR_POSLAN',
      'UGOVOR_OBRISAN',
      'KANDIDAT_DODAN',
      'KANDIDAT_STATUS_PROMIJENJEN'
    )
  );

create or replace function public.trg_log_kandidat_insert()
returns trigger
language plpgsql
as $$
declare
  v_klijent_id uuid;
  v_naziv_pozicije text;
begin
  select p.klijent_id, p.naziv_pozicije
    into v_klijent_id, v_naziv_pozicije
  from public.pozicije p
  where p.id = new.pozicija_id;

  if v_klijent_id is null then
    return new;
  end if;

  perform public.upisi_klijent_aktivnost(
    v_klijent_id,
    'KANDIDAT_DODAN',
    'Dodan kandidat: ' || coalesce(new.ime_prezime, 'Nepoznati kandidat') ||
      coalesce(' (potreba: ' || v_naziv_pozicije || ')', ''),
    'kandidat_insert',
    new.id::text,
    jsonb_build_object(
      'kandidat_id', new.id,
      'pozicija_id', new.pozicija_id,
      'ime_prezime', new.ime_prezime,
      'status', new.status
    ),
    coalesce(new.datum_slanja::timestamptz, now())
  );

  return new;
end;
$$;

create or replace function public.trg_log_kandidat_status_update()
returns trigger
language plpgsql
as $$
declare
  v_klijent_id uuid;
  v_naziv_pozicije text;
  v_source_id text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select p.klijent_id, p.naziv_pozicije
    into v_klijent_id, v_naziv_pozicije
  from public.pozicije p
  where p.id = new.pozicija_id;

  if v_klijent_id is null then
    return new;
  end if;

  v_source_id := new.id::text || ':' || gen_random_uuid()::text;

  perform public.upisi_klijent_aktivnost(
    v_klijent_id,
    'KANDIDAT_STATUS_PROMIJENJEN',
    'Status kandidata ' || coalesce(new.ime_prezime, 'Nepoznati kandidat') ||
      ' promijenjen: ' || coalesce(old.status, '-') || ' -> ' || coalesce(new.status, '-') ||
      coalesce(' (potreba: ' || v_naziv_pozicije || ')', ''),
    'kandidat_status_update',
    v_source_id,
    jsonb_build_object(
      'kandidat_id', new.id,
      'pozicija_id', new.pozicija_id,
      'old_status', old.status,
      'new_status', new.status,
      'ime_prezime', new.ime_prezime
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_klijent_aktivnost_after_kandidat_insert on public.kandidati;
create trigger trg_klijent_aktivnost_after_kandidat_insert
after insert on public.kandidati
for each row
execute function public.trg_log_kandidat_insert();

drop trigger if exists trg_klijent_aktivnost_after_kandidat_status_update on public.kandidati;
create trigger trg_klijent_aktivnost_after_kandidat_status_update
after update of status on public.kandidati
for each row
execute function public.trg_log_kandidat_status_update();

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
  'KANDIDAT_DODAN',
  'Dodan kandidat: ' || coalesce(k.ime_prezime, 'Nepoznati kandidat') ||
    coalesce(' (potreba: ' || p.naziv_pozicije || ')', ''),
  'kandidat_insert',
  k.id::text,
  'Sustav',
  jsonb_build_object(
    'kandidat_id', k.id,
    'pozicija_id', k.pozicija_id,
    'ime_prezime', k.ime_prezime,
    'status', k.status
  ),
  coalesce(k.datum_slanja::timestamptz, now())
from public.kandidati k
join public.pozicije p on p.id = k.pozicija_id
on conflict (source_type, source_id) do nothing;

commit;
