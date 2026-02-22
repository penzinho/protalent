begin;

drop table if exists public.mail_slanje_log;
drop table if exists public.app_postavke;
drop table if exists public.ugovori_dokumenti;

alter table public.klijenti
  drop column if exists email_ugovori;

commit;
