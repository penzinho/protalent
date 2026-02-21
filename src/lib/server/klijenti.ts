import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/server/supabase';
import type { KlijentOverview, KlijentiOverviewRow } from '@/lib/types/klijenti';

interface KlijentiOverviewResult {
  klijenti: KlijentOverview[];
  greska: string | null;
}

const RPC_ERROR_MESSAGE =
  'Trenutno nije moguce dohvatiti klijente. Pokusajte ponovno za nekoliko trenutaka.';

const parseCount = (value: number | string | null): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const mapRowToKlijentOverview = (row: KlijentiOverviewRow): KlijentOverview => ({
  id: row.id,
  naziv_tvrtke: row.naziv_tvrtke,
  skraceni_naziv: row.skraceni_naziv,
  oib: row.oib,
  grad: row.grad,
  industrija: row.industrija,
  brojPozicija: parseCount(row.broj_pozicija_otvoreno),
  brojKandidata: parseCount(row.broj_kandidata_otvoreno),
});

export async function dohvatiKlijenteOverview(): Promise<KlijentiOverviewResult> {
  noStore();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_klijenti_overview');

  if (error) {
    console.error('Greška pri dohvaćanju klijenata preko RPC-a:', error);
    return { klijenti: [], greska: RPC_ERROR_MESSAGE };
  }

  const mapped = ((data as KlijentiOverviewRow[] | null) || []).map(mapRowToKlijentOverview);
  return { klijenti: mapped, greska: null };
}
