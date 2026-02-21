'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Briefcase, Building2, Users, ArrowRight } from 'lucide-react';
import PotrebePregledTablica from '@/components/potrebe/PotrebePregledTablica';
import PotrebePoNacionalnostima from '@/components/potrebe/PotrebePoNacionalnostima';
import type {
  GrupiranaPotrebaRow,
  PotrebaPoNacionalnostiRow,
} from '@/components/potrebe/types';

interface KlijentRef {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
}

type TipRadnika = 'domaci' | 'strani' | 'strani_u_rh';

interface PozicijaItem {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  tip_radnika: TipRadnika;
  nacionalnosti: string[];
  klijenti: KlijentRef | null;
}

interface SupabasePozicijaItem {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  tip_radnika?: string | null;
  pozicije_nacionalnosti?:
    | Array<{ nacionalnosti_radnika?: { naziv?: string | null } | { naziv?: string | null }[] | null }>
    | null;
  klijenti: KlijentRef | KlijentRef[] | null;
}

const normalizirajNaziv = (naziv?: string | null) => (naziv || '').trim().toLowerCase();

const formatirajEure = (iznos: number) =>
  new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number.isFinite(iznos) ? iznos : 0
  );

const formatirajTipRadnika = (tipRadnika: TipRadnika): string => {
  switch (tipRadnika) {
    case 'strani':
      return 'Strani';
    case 'strani_u_rh':
      return 'Strani radnici u RH';
    case 'domaci':
    default:
      return 'Domaći';
  }
};

const parseTipRadnika = (tipRadnika?: string | null): TipRadnika => {
  if (tipRadnika === 'strani' || tipRadnika === 'strani_u_rh' || tipRadnika === 'domaci') {
    return tipRadnika;
  }
  return 'domaci';
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

const izvuciNacionalnosti = (pozicija: SupabasePozicijaItem): string[] => {
  if (!Array.isArray(pozicija.pozicije_nacionalnosti)) return [];

  const mapped = pozicija.pozicije_nacionalnosti
    .map((stavka) => {
      const rel = stavka?.nacionalnosti_radnika;
      if (Array.isArray(rel)) {
        return rel[0]?.naziv || null;
      }
      return rel?.naziv || null;
    })
    .filter((naziv): naziv is string => typeof naziv === 'string' && naziv.trim().length > 0);

  return Array.from(new Set(mapped));
};

const dohvatiNacionalnostiZaPrikaz = (pozicija: PozicijaItem): string[] => {
  if (pozicija.tip_radnika === 'domaci') return ['Hrvat'];
  if (!pozicija.nacionalnosti.length) return ['Nepoznato'];
  return [...pozicija.nacionalnosti];
};

export default function PotrebePage() {
  const [pozicije, setPozicije] = useState<PozicijaItem[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  useEffect(() => {
    const dohvatiPotrebe = async () => {
      setUcitavanje(true);
      setGreska('');

      const selectSaTipomINacionalnostima =
        'id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, tip_radnika, klijenti(id, naziv_tvrtke, skraceni_naziv), pozicije_nacionalnosti(nacionalnosti_radnika(naziv))';
      const selectSaTipom =
        'id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, tip_radnika, klijenti(id, naziv_tvrtke, skraceni_naziv)';
      const selectOsnovno =
        'id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, klijenti(id, naziv_tvrtke, skraceni_naziv)';

      let data: SupabasePozicijaItem[] | null = null;
      let error: unknown = null;

      const rezultatSaNacionalnostima = await supabase
        .from('pozicije')
        .select(selectSaTipomINacionalnostima)
        .eq('status', 'Otvoreno')
        .order('created_at', { ascending: false });

      data = (rezultatSaNacionalnostima.data || null) as SupabasePozicijaItem[] | null;
      error = rezultatSaNacionalnostima.error;

      if (error && jeNedostupnaRelacijaNacionalnosti(error)) {
        const rezultatSaTipom = await supabase
          .from('pozicije')
          .select(selectSaTipom)
          .eq('status', 'Otvoreno')
          .order('created_at', { ascending: false });

        data = (rezultatSaTipom.data || null) as SupabasePozicijaItem[] | null;
        error = rezultatSaTipom.error;
      }

      if (error && jeNepostojecaKolonaTipRadnika(error)) {
        const rezultatOsnovno = await supabase
          .from('pozicije')
          .select(selectOsnovno)
          .eq('status', 'Otvoreno')
          .order('created_at', { ascending: false });

        data = (rezultatOsnovno.data || null) as SupabasePozicijaItem[] | null;
        error = rezultatOsnovno.error;
      }

      if (error) {
        setGreska('Došlo je do greške pri dohvaćanju potreba.');
        setUcitavanje(false);
        return;
      }

      const normalizirano = (data || []).map<PozicijaItem>((pozicija) => ({
        ...pozicija,
        tip_radnika: parseTipRadnika(pozicija.tip_radnika),
        nacionalnosti: izvuciNacionalnosti(pozicija),
        klijenti: Array.isArray(pozicija.klijenti) ? pozicija.klijenti[0] || null : pozicija.klijenti || null,
      }));

      setPozicije(normalizirano);
      setUcitavanje(false);
    };

    void dohvatiPotrebe();
  }, []);

  const grupiranePotrebe = useMemo(() => {
    const mapa = pozicije.reduce<
      Record<
        string,
        {
          kljuc: string;
          naziv: string;
          brojPotreba: number;
          ukupnoRadnika: number;
          sumaCijena: number;
          brojCijena: number;
          klijentIds: Set<string>;
          tipoviSet: Set<string>;
          nacionalnostiSet: Set<string>;
        }
      >
    >((acc, pozicija) => {
      const kljuc = normalizirajNaziv(pozicija.naziv_pozicije);
      if (!kljuc) return acc;

      if (!acc[kljuc]) {
        acc[kljuc] = {
          kljuc,
          naziv: pozicija.naziv_pozicije,
          brojPotreba: 0,
          ukupnoRadnika: 0,
          sumaCijena: 0,
          brojCijena: 0,
          klijentIds: new Set<string>(),
          tipoviSet: new Set<string>(),
          nacionalnostiSet: new Set<string>(),
        };
      }

      acc[kljuc].brojPotreba += 1;
      acc[kljuc].ukupnoRadnika += Number(pozicija.broj_izvrsitelja || 0);

      acc[kljuc].tipoviSet.add(formatirajTipRadnika(pozicija.tip_radnika));
      for (const nacionalnost of dohvatiNacionalnostiZaPrikaz(pozicija)) {
        acc[kljuc].nacionalnostiSet.add(nacionalnost);
      }

      const cijena = Number(pozicija.cijena_po_kandidatu);
      if (Number.isFinite(cijena) && cijena > 0) {
        acc[kljuc].sumaCijena += cijena;
        acc[kljuc].brojCijena += 1;
      }

      if (pozicija.klijenti?.id) {
        acc[kljuc].klijentIds.add(pozicija.klijenti.id);
      }

      return acc;
    }, {});

    const lista = Object.values(mapa).map<GrupiranaPotrebaRow>((stavka) => ({
      kljuc: stavka.kljuc,
      naziv: stavka.naziv,
      brojPotreba: stavka.brojPotreba,
      brojKlijenata: stavka.klijentIds.size,
      ukupnoRadnika: stavka.ukupnoRadnika,
      prosjecnaCijena: stavka.brojCijena > 0 ? stavka.sumaCijena / stavka.brojCijena : 0,
      tipoviRadnika: Array.from(stavka.tipoviSet).sort((a, b) => a.localeCompare(b, 'hr')),
      nacionalnosti: Array.from(stavka.nacionalnostiSet).sort((a, b) => a.localeCompare(b, 'hr')),
    }));

    return lista.sort((a, b) => b.brojPotreba - a.brojPotreba || a.naziv.localeCompare(b.naziv, 'hr'));
  }, [pozicije]);

  const potrebePoNacionalnostima = useMemo(() => {
    const redovi = pozicije.flatMap<PotrebaPoNacionalnostiRow>((pozicija) => {
      const tipRadnikaLabel = formatirajTipRadnika(pozicija.tip_radnika);
      const klijentNaziv =
        pozicija.klijenti?.skraceni_naziv || pozicija.klijenti?.naziv_tvrtke || '-';

      return dohvatiNacionalnostiZaPrikaz(pozicija).map((nacionalnost) => ({
        nacionalnost,
        tipRadnika: tipRadnikaLabel,
        kljuc: normalizirajNaziv(pozicija.naziv_pozicije),
        naziv: pozicija.naziv_pozicije,
        klijentNaziv,
        brojRadnika: Number(pozicija.broj_izvrsitelja || 0),
        cijena: Number(pozicija.cijena_po_kandidatu || 0),
      }));
    });

    return redovi.sort(
      (a, b) =>
        a.nacionalnost.localeCompare(b.nacionalnost, 'hr') ||
        a.naziv.localeCompare(b.naziv, 'hr') ||
        a.klijentNaziv.localeCompare(b.klijentNaziv, 'hr')
    );
  }, [pozicije]);

  const ukupnoPotreba = useMemo(
    () => grupiranePotrebe.reduce((zbroj, stavka) => zbroj + stavka.brojPotreba, 0),
    [grupiranePotrebe]
  );
  const ukupnoRadnika = useMemo(
    () => grupiranePotrebe.reduce((zbroj, stavka) => zbroj + stavka.ukupnoRadnika, 0),
    [grupiranePotrebe]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Otvorene potrebe</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Grupirani pregled otvorenih potreba po nazivu radnog mjesta, neovisno o klijentu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Briefcase size={16} className="text-brand-yellow" /> Različitih potreba
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{grupiranePotrebe.length}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Building2 size={16} className="text-brand-yellow" /> Ukupno zapisa potreba
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{ukupnoPotreba}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Users size={16} className="text-brand-yellow" /> Ukupno traženih radnika
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{ukupnoRadnika}</p>
        </div>
      </div>

      {greska && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3 text-sm">
          {greska}
        </div>
      )}

      {ucitavanje ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Učitavanje potreba...</div>
      ) : grupiranePotrebe.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
          <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-brand-navy dark:text-white">Trenutno nema upisanih potreba</h3>
        </div>
      ) : (
        <div className="space-y-6">
          <PotrebePregledTablica
            redovi={grupiranePotrebe}
            statusParametar="otvoreno"
            formatirajEure={formatirajEure}
          />
          <PotrebePoNacionalnostima
            redovi={potrebePoNacionalnostima}
            formatirajEure={formatirajEure}
          />
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/potrebe/zatvorene"
          className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors"
        >
          Zatvorene potrebe <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
