'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Briefcase, Building2, Users, ArrowRight } from 'lucide-react';

interface PozicijaItem {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  klijenti: { id: string; naziv_tvrtke: string; skraceni_naziv: string | null } | null;
}

interface GrupiranaPotreba {
  kljuc: string;
  naziv: string;
  brojPotreba: number;
  brojKlijenata: number;
  ukupnoRadnika: number;
  otvorene: number;
  zatvorene: number;
  prosjecnaCijena: number;
}

const normalizirajNaziv = (naziv?: string | null) => (naziv || '').trim().toLowerCase();

const formatirajEure = (iznos: number) =>
  new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number.isFinite(iznos) ? iznos : 0
  );

export default function PotrebePage() {
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
        .eq('status', 'Otvoreno')
        .order('created_at', { ascending: false });

      if (error) {
        setGreska('Došlo je do greške pri dohvaćanju potreba.');
        setUcitavanje(false);
        return;
      }

      setPozicije((data || []) as PozicijaItem[]);
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
          otvorene: number;
          zatvorene: number;
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
          otvorene: 0,
          zatvorene: 0,
          sumaCijena: 0,
          brojCijena: 0,
          klijentIds: new Set<string>(),
        };
      }

      acc[kljuc].brojPotreba += 1;
      acc[kljuc].ukupnoRadnika += Number(pozicija.broj_izvrsitelja || 0);

      if ((pozicija.status || '').toLowerCase() === 'zatvoreno') {
        acc[kljuc].zatvorene += 1;
      } else {
        acc[kljuc].otvorene += 1;
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

    const lista = Object.values(mapa).map<GrupiranaPotreba>((stavka) => ({
      kljuc: stavka.kljuc,
      naziv: stavka.naziv,
      brojPotreba: stavka.brojPotreba,
      brojKlijenata: stavka.klijentIds.size,
      ukupnoRadnika: stavka.ukupnoRadnika,
      otvorene: stavka.otvorene,
      zatvorene: stavka.zatvorene,
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
        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                  <th className="py-4 px-6">Radno mjesto</th>
                  <th className="py-4 px-6 text-center">Potrebe</th>
                  <th className="py-4 px-6 text-center">Klijenti</th>
                  <th className="py-4 px-6 text-center">Radnici</th>
                  <th className="py-4 px-6 text-right">Prosj. cijena</th>
                  <th className="py-4 px-6 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grupiranePotrebe.map((potreba) => (
                  <tr key={potreba.kljuc} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <p className="font-bold text-brand-navy dark:text-white">{potreba.naziv}</p>
                    </td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 font-semibold">{potreba.brojPotreba}</td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{potreba.brojKlijenata}</td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{potreba.ukupnoRadnika}</td>
                    <td className="py-4 px-6 text-right text-brand-navy dark:text-white font-semibold">
                      {formatirajEure(potreba.prosjecnaCijena)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/potrebe/${encodeURIComponent(potreba.kljuc)}?status=otvoreno`}
                        className="inline-flex items-center gap-1 text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                      >
                        Detalji <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
