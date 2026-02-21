create or replace function public.get_klijenti_overview()
returns table (
  id text,
  naziv_tvrtke text,
  skraceni_naziv text,
  oib text,
  grad text,
  industrija text,
  broj_pozicija_otvoreno integer,
  broj_kandidata_otvoreno integer
)
language sql
security invoker
set search_path = public
as $$
  select
    k.id::text as id,
    k.naziv_tvrtke::text as naziv_tvrtke,
    k.skraceni_naziv::text as skraceni_naziv,
    k.oib::text as oib,
    k.grad::text as grad,
    k.industrija::text as industrija,
    count(p.id)::integer as broj_pozicija_otvoreno,
    coalesce(sum(coalesce(p.broj_izvrsitelja, 0)), 0)::integer as broj_kandidata_otvoreno
  from public.klijenti k
  left join public.pozicije p
    on p.klijent_id = k.id
   and lower(coalesce(p.status, '')) = 'otvoreno'
  group by
    k.id,
    k.naziv_tvrtke,
    k.skraceni_naziv,
    k.oib,
    k.grad,
    k.industrija,
    k.created_at
  order by k.created_at desc nulls last;
$$;

grant execute on function public.get_klijenti_overview() to anon;
grant execute on function public.get_klijenti_overview() to authenticated;
