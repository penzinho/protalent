begin;

alter table public.pozicije
  drop constraint if exists pozicije_tip_radnika_check;

alter table public.pozicije
  drop column if exists tip_radnika;

commit;
