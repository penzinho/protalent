begin;

alter table public.pozicije
  add column if not exists tip_radnika text;

update public.pozicije
set tip_radnika = 'domaci'
where tip_radnika is null;

alter table public.pozicije
  alter column tip_radnika set default 'domaci';

alter table public.pozicije
  alter column tip_radnika set not null;

alter table public.pozicije
  add constraint pozicije_tip_radnika_check
  check (tip_radnika in ('domaci', 'strani', 'strani_u_rh'));

commit;
