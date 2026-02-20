'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, LayoutGrid, List, Users, Euro } from 'lucide-react';

interface PozicijaDetalj {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  datum_upisa: string;
  klijenti: { id: string; naziv_tvrtke: string; skraceni_naziv: string | null } | null;
}

interface GrupiranoPoKlijentu {
  klijentId: string;
  klijentNaziv: string;
  brojPotreba: number;
  ukupnoRadnika: number;
  otvorene: number;
  zatvorene: number;
  prosjecnaCijena: number;
  ukupnaVrijednost: number;
}

const PRIKAZ_STORAGE_KEY = 'hr-potrebe-detalj-prikaz';

const normalizirajNaziv = (naziv?: string | null) => (naziv || '').trim().toLowerCase();

const formatirajDatum = (datumString?: string | null) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`;
};

const formatirajEure = (iznos: number) =>
  new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number.isFinite(iznos) ? iznos : 0
  );

export default function PotrebaDetaljiPage() {
  const { naziv } = useParams<{ naziv: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pozicije, setPozicije] = useState<PozicijaDetalj[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');
  const [prikaz, setPrikaz] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem(PRIKAZ_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  });

  const nazivKljuc = useMemo(() => decodeURIComponent(naziv || ''), [naziv]);
  const statusFilter = searchParams.get('status') === 'zatvoreno' ? 'Zatvoreno' : 'Otvoreno';

  useEffect(() => {
    const dohvatiPozicije = async () => {
      setUcitavanje(true);
      setGreska('');

      const { data, error } = await supabase
        .from('pozicije')
        .select('id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, datum_upisa, klijenti(id, naziv_tvrtke, skraceni_naziv)')
        .order('created_at', { ascending: false });

      if (error) {
        setGreska('Došlo je do greške pri dohvaćanju detalja potrebe.');
        setUcitavanje(false);
        return;
      }

      const filtrirano = ((data || []) as PozicijaDetalj[]).filter(
        (pozicija) =>
          normalizirajNaziv(pozicija.naziv_pozicije) === nazivKljuc &&
          (statusFilter === 'Zatvoreno'
            ? (pozicija.status || '').toLowerCase() === 'zatvoreno'
            : (pozicija.status || '').toLowerCase() !== 'zatvoreno')
      );

      setPozicije(filtrirano);
      setUcitavanje(false);
    };

    if (!nazivKljuc) return;
    void dohvatiPozicije();
  }, [nazivKljuc, statusFilter]);

  const promijeniPrikaz = (noviPrikaz: 'cards' | 'table') => {
    setPrikaz(noviPrikaz);
    window.localStorage.setItem(PRIKAZ_STORAGE_KEY, noviPrikaz);
  };

  const grupiranoPoKlijentu = useMemo(() => {
    const mapa = pozicije.reduce<
      Record<
        string,
        {
          klijentId: string;
          klijentNaziv: string;
          brojPotreba: number;
          ukupnoRadnika: number;
          otvorene: number;
          zatvorene: number;
          sumaCijena: number;
          brojCijena: number;
          ukupnaVrijednost: number;
        }
      >
    >((acc, pozicija) => {
      const klijentId = pozicija.klijenti?.id || 'nepoznat';
      const klijentNaziv = pozicija.klijenti?.skraceni_naziv || pozicija.klijenti?.naziv_tvrtke || 'Nepoznat klijent';
      const cijena = Number(pozicija.cijena_po_kandidatu || 0);
      const radnici = Number(pozicija.broj_izvrsitelja || 0);

      if (!acc[klijentId]) {
        acc[klijentId] = {
          klijentId,
          klijentNaziv,
          brojPotreba: 0,
          ukupnoRadnika: 0,
          otvorene: 0,
          zatvorene: 0,
          sumaCijena: 0,
          brojCijena: 0,
          ukupnaVrijednost: 0,
        };
      }

      acc[klijentId].brojPotreba += 1;
      acc[klijentId].ukupnoRadnika += radnici;
      if ((pozicija.status || '').toLowerCase() === 'zatvoreno') {
        acc[klijentId].zatvorene += 1;
      } else {
        acc[klijentId].otvorene += 1;
      }

      if (Number.isFinite(cijena) && cijena > 0) {
        acc[klijentId].sumaCijena += cijena;
        acc[klijentId].brojCijena += 1;
      }

      acc[klijentId].ukupnaVrijednost += Number.isFinite(cijena) ? cijena * radnici : 0;
      return acc;
    }, {});

    const lista = Object.values(mapa).map<GrupiranoPoKlijentu>((stavka) => ({
      klijentId: stavka.klijentId,
      klijentNaziv: stavka.klijentNaziv,
      brojPotreba: stavka.brojPotreba,
      ukupnoRadnika: stavka.ukupnoRadnika,
      otvorene: stavka.otvorene,
      zatvorene: stavka.zatvorene,
      prosjecnaCijena: stavka.brojCijena > 0 ? stavka.sumaCijena / stavka.brojCijena : 0,
      ukupnaVrijednost: stavka.ukupnaVrijednost,
    }));

    return lista.sort((a, b) => b.brojPotreba - a.brojPotreba || a.klijentNaziv.localeCompare(b.klijentNaziv, 'hr'));
  }, [pozicije]);

  const naslov = pozicije[0]?.naziv_pozicije || nazivKljuc || 'Potreba';

  const ukupnoRadnika = useMemo(
    () => grupiranoPoKlijentu.reduce((zbroj, stavka) => zbroj + stavka.ukupnoRadnika, 0),
    [grupiranoPoKlijentu]
  );

  const ukupnoProsjecnaCijena = useMemo(() => {
    const sveCijene = pozicije
      .map((pozicija) => Number(pozicija.cijena_po_kandidatu))
      .filter((cijena) => Number.isFinite(cijena) && cijena > 0);

    if (sveCijene.length === 0) return 0;
    return sveCijene.reduce((zbroj, cijena) => zbroj + cijena, 0) / sveCijene.length;
  }, [pozicije]);

  const ukupnaVrijednost = useMemo(
    () => grupiranoPoKlijentu.reduce((zbroj, stavka) => zbroj + stavka.ukupnaVrijednost, 0),
    [grupiranoPoKlijentu]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <button
        onClick={() => router.push(statusFilter === 'Zatvoreno' ? '/potrebe/zatvorene' : '/potrebe')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors font-medium"
      >
        <ArrowLeft size={20} /> Natrag na {statusFilter === 'Zatvoreno' ? 'zatvorene' : 'otvorene'} potrebe
      </button>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-white">{naslov}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Pregled {statusFilter.toLowerCase()} potrebe raščlanjen po klijentima
          </p>
        </div>

        <div className="flex bg-white dark:bg-[#0A2B50] rounded-xl p-1 border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => promijeniPrikaz('cards')}
            title="Prikaz kartica"
            className={`p-2 rounded-lg transition-all duration-200 ${
              prikaz === 'cards'
                ? 'bg-gray-100 dark:bg-[#05182d] text-brand-orange shadow-sm'
                : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => promijeniPrikaz('table')}
            title="Prikaz tablice"
            className={`p-2 rounded-lg transition-all duration-200 ${
              prikaz === 'table'
                ? 'bg-gray-100 dark:bg-[#05182d] text-brand-orange shadow-sm'
                : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Building2 size={16} className="text-brand-yellow" /> Klijenti
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{grupiranoPoKlijentu.length}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Users size={16} className="text-brand-yellow" /> Potrebe
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{pozicije.length}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Users size={16} className="text-brand-yellow" /> Ukupno radnika
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{ukupnoRadnika}</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Euro size={16} className="text-brand-yellow" /> Prosj. cijena
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">{formatirajEure(ukupnoProsjecnaCijena)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Procijenjena ukupna ugovorena vrijednost (cijena x broj radnika)</p>
        <p className="text-2xl font-bold text-brand-navy dark:text-white mt-1">{formatirajEure(ukupnaVrijednost)}</p>
      </div>

      {greska && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3 text-sm">
          {greska}
        </div>
      )}

      {ucitavanje ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Učitavanje detalja potrebe...</div>
      ) : grupiranoPoKlijentu.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
          <h3 className="text-lg font-medium text-brand-navy dark:text-white">Nema zapisa za ovu potrebu</h3>
        </div>
      ) : prikaz === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {grupiranoPoKlijentu.map((stavka) => (
            <div key={stavka.klijentId} className="bg-white dark:bg-[#0A2B50] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-brand-navy dark:text-white">{stavka.klijentNaziv}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Potrebe: {stavka.brojPotreba}</p>
                </div>
                {stavka.klijentId !== 'nepoznat' && (
                  <Link href={`/klijenti/${stavka.klijentId}`} className="text-brand-yellow hover:text-brand-orange text-sm font-medium">
                    Otvori klijenta
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-[#05182d] rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Ukupno radnika</p>
                  <p className="font-bold text-brand-navy dark:text-white">{stavka.ukupnoRadnika}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#05182d] rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Prosj. cijena</p>
                  <p className="font-bold text-brand-navy dark:text-white">{formatirajEure(stavka.prosjecnaCijena)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#05182d] rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Otvorene / Zatvorene</p>
                  <p className="font-bold text-brand-navy dark:text-white">
                    {stavka.otvorene} / {stavka.zatvorene}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-[#05182d] rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Ukupna vrijednost</p>
                  <p className="font-bold text-brand-navy dark:text-white">{formatirajEure(stavka.ukupnaVrijednost)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                  <th className="py-4 px-6">Klijent</th>
                  <th className="py-4 px-6 text-center">Potrebe</th>
                  <th className="py-4 px-6 text-center">Radnici</th>
                  <th className="py-4 px-6 text-center">O/Z</th>
                  <th className="py-4 px-6 text-right">Prosj. cijena</th>
                  <th className="py-4 px-6 text-right">Ukupna vrijednost</th>
                  <th className="py-4 px-6 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grupiranoPoKlijentu.map((stavka) => (
                  <tr key={stavka.klijentId} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-brand-navy dark:text-white">{stavka.klijentNaziv}</td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{stavka.brojPotreba}</td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{stavka.ukupnoRadnika}</td>
                    <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">
                      {stavka.otvorene}/{stavka.zatvorene}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-brand-navy dark:text-white">
                      {formatirajEure(stavka.prosjecnaCijena)}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-brand-navy dark:text-white">
                      {formatirajEure(stavka.ukupnaVrijednost)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {stavka.klijentId !== 'nepoznat' ? (
                        <Link
                          href={`/klijenti/${stavka.klijentId}`}
                          className="text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                        >
                          Otvori klijenta
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pozicije.length > 0 && (
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white mb-3">Zadnja ažuriranja</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pozicije.slice(0, 6).map((pozicija) => (
              <div key={pozicija.id} className="bg-gray-50 dark:bg-[#05182d] rounded-xl p-3 text-sm">
                <p className="font-semibold text-brand-navy dark:text-white">{pozicija.klijenti?.skraceni_naziv || pozicija.klijenti?.naziv_tvrtke || 'Nepoznat klijent'}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Datum upisa: {formatirajDatum(pozicija.datum_upisa)}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Cijena: {formatirajEure(Number(pozicija.cijena_po_kandidatu || 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
