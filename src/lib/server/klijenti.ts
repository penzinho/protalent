import 'server-only';

import { createSupabaseServerClient } from '@/lib/server/supabase';
import type {
  KlijentDetalji,
  KlijentOverview,
  KlijentiOverviewRow,
  PozicijaDetalji,
} from '@/lib/types/klijenti';

interface KlijentiOverviewResult {
  klijenti: KlijentOverview[];
  greska: string | null;
}

interface KlijentDetaljiResult {
  klijent: KlijentDetalji | null;
  pozicije: PozicijaDetalji[];
  greska: string | null;
}

interface PozicijeQueryResult {
  data: Record<string, unknown>[] | null;
  error: unknown;
}

const RPC_ERROR_MESSAGE =
  'Trenutno nije moguce dohvatiti klijente. Pokusajte ponovno za nekoliko trenutaka.';
const DETAILS_ERROR_MESSAGE =
  'Trenutno nije moguce dohvatiti podatke o klijentu. Pokusajte ponovno za nekoliko trenutaka.';
const SELECT_POZICIJE_SA_SVIM_NACIONALNOSTIMA =
  'id, klijent_id, naziv_pozicije, broj_izvrsitelja, datum_upisa, tip_radnika, cijena_po_kandidatu, avans_dogovoren, avans_postotak, status, pozicije_nacionalnosti(nacionalnosti_radnika(naziv))';
const SELECT_POZICIJE_WITH_TIP_RADNIKA =
  'id, klijent_id, naziv_pozicije, broj_izvrsitelja, datum_upisa, tip_radnika, cijena_po_kandidatu, avans_dogovoren, avans_postotak, status';
const SELECT_POZICIJE_BEZ_TIPA_RADNIKA =
  'id, klijent_id, naziv_pozicije, broj_izvrsitelja, datum_upisa, cijena_po_kandidatu, avans_dogovoren, avans_postotak, status';

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

const parseTipRadnika = (value: unknown): 'domaci' | 'strani' | 'strani_u_rh' => {
  if (value === 'domaci' || value === 'strani' || value === 'strani_u_rh') {
    return value;
  }
  return 'domaci';
};

const jeNepostojecaKolonaTipRadnika = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as { code?: string | null; message?: string | null; details?: string | null };
  const code = String(payload.code || '');
  const text = `${payload.message || ''} ${payload.details || ''}`.toLowerCase();

  return (
    code === '42703' ||
    (text.includes('tip_radnika') &&
      (text.includes('does not exist') || text.includes('could not find')))
  );
};

const jeNedostupnaRelacijaNacionalnosti = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as { code?: string | null; message?: string | null; details?: string | null };
  const code = String(payload.code || '');
  const text = `${payload.message || ''} ${payload.details || ''}`.toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST200' ||
    text.includes('pozicije_nacionalnosti') ||
    text.includes('nacionalnosti_radnika')
  );
};

const formatSupabaseError = (error: unknown): string => {
  if (!error) return 'none';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const payload = error as { code?: string | null; message?: string | null; details?: string | null };
    const parts = [payload.code, payload.message, payload.details].filter(Boolean);
    return parts.length ? parts.join(' | ') : JSON.stringify(error);
  }
  return String(error);
};

export async function dohvatiKlijenteOverview(): Promise<KlijentiOverviewResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_klijenti_overview');

  if (error) {
    console.error('Greška pri dohvaćanju klijenata preko RPC-a:', error);
    return { klijenti: [], greska: RPC_ERROR_MESSAGE };
  }

  const mapped = ((data as KlijentiOverviewRow[] | null) || []).map(mapRowToKlijentOverview);
  return { klijenti: mapped, greska: null };
}

const parseNacionalnosti = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const mapped = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as {
        nacionalnosti_radnika?:
          | { naziv?: unknown }
          | Array<{ naziv?: unknown }>
          | null;
      };
      const nested = row.nacionalnosti_radnika;

      if (Array.isArray(nested)) {
        const naziv = nested[0]?.naziv;
        return typeof naziv === 'string' ? naziv : null;
      }

      if (nested && typeof nested === 'object') {
        const naziv = (nested as { naziv?: unknown }).naziv;
        return typeof naziv === 'string' ? naziv : null;
      }

      return null;
    })
    .filter((naziv): naziv is string => Boolean(naziv));

  return Array.from(new Set(mapped));
};

const mapPozicija = (row: Record<string, unknown>): PozicijaDetalji => ({
  id: String(row.id ?? ''),
  klijent_id: String(row.klijent_id ?? ''),
  naziv_pozicije: String(row.naziv_pozicije ?? ''),
  broj_izvrsitelja: parseCount((row.broj_izvrsitelja as number | string | null) ?? 0),
  datum_upisa: String(row.datum_upisa ?? ''),
  tip_radnika: parseTipRadnika(row.tip_radnika),
  nacionalnosti: parseNacionalnosti(row.pozicije_nacionalnosti),
  cijena_po_kandidatu: parseCount((row.cijena_po_kandidatu as number | string | null) ?? 0),
  avans_dogovoren: Boolean(row.avans_dogovoren),
  avans_postotak:
    row.avans_postotak === null || row.avans_postotak === undefined
      ? null
      : parseCount((row.avans_postotak as number | string | null) ?? 0),
  status: row.status ? String(row.status) : null,
});

export async function dohvatiKlijentaDetalje(id: string): Promise<KlijentDetaljiResult> {
  const supabase = createSupabaseServerClient();

  const klijentPromise = supabase
    .from('klijenti')
    .select('id, naziv_tvrtke, skraceni_naziv, industrija, oib, mbs, ulica, grad')
    .eq('id', id)
    .single();

  let pozicijeRes = (await supabase
    .from('pozicije')
    .select(SELECT_POZICIJE_SA_SVIM_NACIONALNOSTIMA)
    .eq('klijent_id', id)
    .order('created_at', { ascending: false })) as unknown as PozicijeQueryResult;

  if (pozicijeRes.error && jeNedostupnaRelacijaNacionalnosti(pozicijeRes.error)) {
    pozicijeRes = (await supabase
      .from('pozicije')
      .select(SELECT_POZICIJE_WITH_TIP_RADNIKA)
      .eq('klijent_id', id)
      .order('created_at', { ascending: false })) as unknown as PozicijeQueryResult;
  }

  if (pozicijeRes.error && jeNepostojecaKolonaTipRadnika(pozicijeRes.error)) {
    pozicijeRes = (await supabase
      .from('pozicije')
      .select(SELECT_POZICIJE_BEZ_TIPA_RADNIKA)
      .eq('klijent_id', id)
      .order('created_at', { ascending: false })) as unknown as PozicijeQueryResult;
  }

  const klijentRes = await klijentPromise;

  if (klijentRes.error || pozicijeRes.error) {
    console.error(
      `Greška pri dohvaćanju detalja klijenta (id=${id}) | klijent: ${formatSupabaseError(
        klijentRes.error
      )} | pozicije: ${formatSupabaseError(pozicijeRes.error)}`
    );
    return { klijent: null, pozicije: [], greska: DETAILS_ERROR_MESSAGE };
  }

  return {
    klijent: (klijentRes.data as KlijentDetalji | null) ?? null,
    pozicije: (pozicijeRes.data || []).map(mapPozicija),
    greska: null,
  };
}
