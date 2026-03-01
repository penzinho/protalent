'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CircleDollarSign, Clock3, TrendingUp, Users } from 'lucide-react';
import Select from '@/components/ui/Select';

interface KlijentRef {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
}

interface PozicijaRef {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  datum_upisa: string;
  klijenti: KlijentRef | null;
}

interface SupabasePozicijaRef {
  id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  cijena_po_kandidatu: number;
  status: string | null;
  datum_upisa: string;
  klijenti: KlijentRef | KlijentRef[] | null;
}

interface ZaposleniKandidat {
  id: string;
  ime_prezime: string;
  status: string;
  datum_slanja: string;
  pozicija_id: string;
  pozicije: PozicijaRef | null;
}

interface SupabaseZaposleniKandidat {
  id: string;
  ime_prezime: string;
  status: string;
  datum_slanja: string;
  pozicija_id: string;
  pozicije: SupabasePozicijaRef | SupabasePozicijaRef[] | null;
}

const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`;
};

const formatirajEure = (iznos: number) =>
  new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number.isFinite(iznos) ? iznos : 0
  );

const godinaIzDatuma = (datumString?: string | null) => {
  if (!datumString) return null;
  const datum = new Date(datumString);
  if (Number.isNaN(datum.getTime())) return null;
  return datum.getFullYear();
};

const normalizirajKlijenta = (klijent: KlijentRef | KlijentRef[] | null): KlijentRef | null => {
  if (!klijent) return null;
  return Array.isArray(klijent) ? klijent[0] || null : klijent;
};

const normalizirajPoziciju = (pozicija: SupabasePozicijaRef): PozicijaRef => ({
  ...pozicija,
  klijenti: normalizirajKlijenta(pozicija.klijenti),
});

export default function PrihodiPage() {
  const tekucaGodina = new Date().getFullYear();

  const [odabranaGodina, setOdabranaGodina] = useState<number>(tekucaGodina);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');
  const [zaposleniKandidati, setZaposleniKandidati] = useState<ZaposleniKandidat[]>([]);
  const [otvorenePozicije, setOtvorenePozicije] = useState<PozicijaRef[]>([]);

  const opcijeGodina = useMemo(() => {
    const godine: number[] = [];
    for (let i = tekucaGodina; i >= tekucaGodina - 5; i -= 1) {
      godine.push(i);
    }
    return godine;
  }, [tekucaGodina]);

  useEffect(() => {
    const dohvatiPodatke = async () => {
      setUcitavanje(true);
      setGreska('');

      const [kandidatiRes, pozicijeRes] = await Promise.all([
        supabase
          .from('kandidati')
          .select(
            'id, ime_prezime, status, datum_slanja, pozicija_id, pozicije(id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, datum_upisa, klijenti(id, naziv_tvrtke, skraceni_naziv))'
          )
          .eq('status', 'Zaposlen'),
        supabase
          .from('pozicije')
          .select('id, naziv_pozicije, broj_izvrsitelja, cijena_po_kandidatu, status, datum_upisa, klijenti(id, naziv_tvrtke, skraceni_naziv)')
          .eq('status', 'Otvoreno'),
      ]);

      if (kandidatiRes.error || pozicijeRes.error) {
        setGreska('Došlo je do greške pri dohvaćanju prihoda.');
        setUcitavanje(false);
        return;
      }

      const normaliziraniKandidati = ((kandidatiRes.data || []) as SupabaseZaposleniKandidat[]).map<ZaposleniKandidat>(
        (kandidat) => {
          const rawPozicija = Array.isArray(kandidat.pozicije) ? kandidat.pozicije[0] : kandidat.pozicije;

          return {
            ...kandidat,
            pozicije: rawPozicija ? normalizirajPoziciju(rawPozicija) : null,
          };
        }
      );

      const normaliziranePozicije = ((pozicijeRes.data || []) as SupabasePozicijaRef[]).map<PozicijaRef>(
        (pozicija) => normalizirajPoziciju(pozicija)
      );

      setZaposleniKandidati(normaliziraniKandidati);
      setOtvorenePozicije(normaliziranePozicije);
      setUcitavanje(false);
    };

    void dohvatiPodatke();
  }, []);

  const zaposleniUgodini = useMemo(
    () =>
      zaposleniKandidati.filter((kandidat) => godinaIzDatuma(kandidat.datum_slanja) === odabranaGodina),
    [zaposleniKandidati, odabranaGodina]
  );

  const otvorenePozicijeUgodini = useMemo(
    () => otvorenePozicije.filter((pozicija) => godinaIzDatuma(pozicija.datum_upisa) === odabranaGodina),
    [otvorenePozicije, odabranaGodina]
  );

  const cekajuNaplatuStavke = useMemo(
    () =>
      zaposleniUgodini
        .map((kandidat) => {
          const cijena = Number(kandidat.pozicije?.cijena_po_kandidatu || 0);
          return {
            id: kandidat.id,
            imePrezime: kandidat.ime_prezime,
            datum: kandidat.datum_slanja,
            klijent: kandidat.pozicije?.klijenti?.skraceni_naziv || kandidat.pozicije?.klijenti?.naziv_tvrtke || '-',
            pozicija: kandidat.pozicije?.naziv_pozicije || '-',
            iznos: Number.isFinite(cijena) ? cijena : 0,
          };
        })
        .filter((stavka) => stavka.iznos > 0),
    [zaposleniUgodini]
  );

  const ukupanCekaNaplatu = useMemo(
    () => cekajuNaplatuStavke.reduce((zbroj, stavka) => zbroj + stavka.iznos, 0),
    [cekajuNaplatuStavke]
  );

  const potencijalneStavke = useMemo(() => {
    const zaposleniPoPoziciji = zaposleniUgodini.reduce<Record<string, number>>((acc, kandidat) => {
      acc[kandidat.pozicija_id] = (acc[kandidat.pozicija_id] || 0) + 1;
      return acc;
    }, {});

    return otvorenePozicijeUgodini
      .map((pozicija) => {
        const trazeno = Number(pozicija.broj_izvrsitelja || 0);
        const cijena = Number(pozicija.cijena_po_kandidatu || 0);
        const zaposleno = zaposleniPoPoziciji[pozicija.id] || 0;
        const preostalo = Math.max(trazeno - zaposleno, 0);
        const potencijalno = preostalo * (Number.isFinite(cijena) ? cijena : 0);

        return {
          id: pozicija.id,
          klijent: pozicija.klijenti?.skraceni_naziv || pozicija.klijenti?.naziv_tvrtke || '-',
          pozicija: pozicija.naziv_pozicije,
          trazeno,
          zaposleno,
          preostalo,
          potencijalno,
        };
      })
      .filter((stavka) => stavka.potencijalno > 0);
  }, [otvorenePozicijeUgodini, zaposleniUgodini]);

  const ukupanPotencijalno = useMemo(
    () => potencijalneStavke.reduce((zbroj, stavka) => zbroj + stavka.potencijalno, 0),
    [potencijalneStavke]
  );

  const ukupanNaplaceno = 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Prihodi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Dashboard naplate i potencijala po godini</p>
        </div>

        <div className="w-full md:w-40">
          <Select
            label="Godina"
            value={String(odabranaGodina)}
            onChange={(v) => setOdabranaGodina(Number(v))}
            options={opcijeGodina.map((g) => ({ value: String(g), label: String(g) }))}
          />
        </div>
      </div>

      {greska && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3 text-sm">
          {greska}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <CircleDollarSign size={16} className="text-brand-yellow" />
            Naplaćeno
          </div>
          <p className="text-3xl font-bold text-brand-navy dark:text-white mt-2">{formatirajEure(ukupanNaplaceno)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Implementacija naplaćenog dolazi uskoro.</p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <Clock3 size={16} className="text-brand-orange" />
            Čeka se naplata
          </div>
          <p className="text-3xl font-bold text-brand-navy dark:text-white mt-2">{formatirajEure(ukupanCekaNaplatu)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Zaposleni kandidati (bez fakturiranja) u {odabranaGodina}.: {cekajuNaplatuStavke.length}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            Potencijalno
          </div>
          <p className="text-3xl font-bold text-brand-navy dark:text-white mt-2">{formatirajEure(ukupanPotencijalno)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Otvorene potrebe u {odabranaGodina}.: {potencijalneStavke.length}
          </p>
        </div>
      </div>

      {ucitavanje ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Učitavanje podataka o prihodima...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
                <Users size={18} className="text-brand-yellow" /> Čeka se naplata
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Zaposleni kandidati koji još nisu fakturirani ({odabranaGodina}.)
              </p>
            </div>

            {cekajuNaplatuStavke.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nema stavki za prikaz.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-[#05182d] text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="px-5 py-3">Kandidat</th>
                      <th className="px-5 py-3">Pozicija</th>
                      <th className="px-5 py-3">Datum</th>
                      <th className="px-5 py-3 text-right">Iznos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {cekajuNaplatuStavke.map((stavka) => (
                      <tr key={stavka.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-brand-navy dark:text-white">{stavka.imePrezime}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{stavka.klijent}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{stavka.pozicija}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{formatirajDatum(stavka.datum)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-right text-brand-navy dark:text-white">
                          {formatirajEure(stavka.iznos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600 dark:text-green-400" /> Potencijalno
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Procjena iz otvorenih potreba ({odabranaGodina}.)
              </p>
            </div>

            {potencijalneStavke.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nema otvorenog potencijala.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-[#05182d] text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="px-5 py-3">Klijent / Pozicija</th>
                      <th className="px-5 py-3 text-center">Preostalo</th>
                      <th className="px-5 py-3 text-right">Potencijal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {potencijalneStavke.map((stavka) => (
                      <tr key={stavka.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-brand-navy dark:text-white">{stavka.pozicija}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{stavka.klijent}</p>
                        </td>
                        <td className="px-5 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                          {stavka.preostalo} / {stavka.trazeno}
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-right text-brand-navy dark:text-white">
                          {formatirajEure(stavka.potencijalno)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
