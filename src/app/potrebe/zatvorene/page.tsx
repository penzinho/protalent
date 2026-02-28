'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Briefcase, Building2, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/ui/data-table';

interface KlijentRef {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
}

interface PozicijaItem {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  klijenti: KlijentRef | null;
}

interface SupabasePozicijaItem {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  klijenti: KlijentRef | KlijentRef[] | null;
}

interface GrupiranaPotreba {
  kljuc: string;
  naziv: string;
  brojPotreba: number;
  brojKlijenata: number;
  ukupnoRadnika: number;
  prosjecnaCijena: number;
}

const normalizirajNaziv = (naziv?: string | null) => (naziv || '').trim().toLowerCase();

const formatirajEure = (iznos: number) =>
  new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number.isFinite(iznos) ? iznos : 0
  );

export default function ZatvorenePotrebePage() {
  const [pozicije, setPozicije] = useState<PozicijaItem[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  useEffect(() => {
    const dohvatiPotrebe = async () => {
      setUcitavanje(true);
      setGreska('');

      const { data, error } = await supabase
        .from('pozicije')
        .select('id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, klijenti(id, naziv_tvrtke, skraceni_naziv)')
        .eq('status', 'Zatvoreno')
        .order('created_at', { ascending: false });

      if (error) {
        setGreska('Došlo je do greške pri dohvaćanju zatvorenih potreba.');
        setUcitavanje(false);
        return;
      }

      const normalizirano = ((data || []) as SupabasePozicijaItem[]).map<PozicijaItem>((pozicija) => ({
        ...pozicija,
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
        };
      }

      acc[kljuc].brojPotreba += 1;
      acc[kljuc].ukupnoRadnika += Number(pozicija.broj_izvrsitelja || 0);

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

    const lista = Object.values(mapa).map<GrupiranaPotreba>((stavka) => ({
      kljuc: stavka.kljuc,
      naziv: stavka.naziv,
      brojPotreba: stavka.brojPotreba,
      brojKlijenata: stavka.klijentIds.size,
      ukupnoRadnika: stavka.ukupnoRadnika,
      prosjecnaCijena: stavka.brojCijena > 0 ? stavka.sumaCijena / stavka.brojCijena : 0,
    }));

    return lista.sort((a, b) => b.brojPotreba - a.brojPotreba || a.naziv.localeCompare(b.naziv, 'hr'));
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
        <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Zatvorene potrebe</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Grupirani pregled zatvorenih potreba po nazivu radnog mjesta, neovisno o klijentu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Briefcase size={16} className="text-red-500" /> Različitih potreba
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{grupiranePotrebe.length}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Building2 size={16} className="text-red-500" /> Ukupno zapisa potreba
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{ukupnoPotreba}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Users size={16} className="text-red-500" /> Ukupno traženih radnika
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
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Učitavanje zatvorenih potreba...</div>
      ) : grupiranePotrebe.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
          <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-brand-navy dark:text-white">Trenutno nema zatvorenih potreba</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <DataTable className="w-full text-left border-collapse">
              <DataTableHeader>
                <DataTableRow className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                  <DataTableHead className="py-4 px-6">Radno mjesto</DataTableHead>
                  <DataTableHead className="py-4 px-6 text-center">Potrebe</DataTableHead>
                  <DataTableHead className="py-4 px-6 text-center">Klijenti</DataTableHead>
                  <DataTableHead className="py-4 px-6 text-center">Radnici</DataTableHead>
                  <DataTableHead className="py-4 px-6 text-right">Prosj. cijena</DataTableHead>
                  <DataTableHead className="py-4 px-6 text-right">Akcije</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grupiranePotrebe.map((potreba) => (
                  <DataTableRow key={potreba.kljuc} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                    <DataTableCell className="py-4 px-6">
                      <p className="font-bold text-brand-navy dark:text-white">{potreba.naziv}</p>
                    </DataTableCell>
                    <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 font-semibold">{potreba.brojPotreba}</DataTableCell>
                    <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{potreba.brojKlijenata}</DataTableCell>
                    <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{potreba.ukupnoRadnika}</DataTableCell>
                    <DataTableCell className="py-4 px-6 text-right text-brand-navy dark:text-white font-semibold">
                      {formatirajEure(potreba.prosjecnaCijena)}
                    </DataTableCell>
                    <DataTableCell className="py-4 px-6 text-right">
                      <Link
                        href={`/potrebe/${encodeURIComponent(potreba.kljuc)}?status=zatvoreno`}
                        className="inline-flex items-center gap-1 text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                      >
                        Detalji <ArrowRight size={14} />
                      </Link>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/potrebe"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-yellow hover:text-brand-orange transition-colors"
        >
          <ArrowLeft size={14} /> Otvorene potrebe
        </Link>
      </div>
    </div>
  );
}
