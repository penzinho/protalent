'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Briefcase, Plus, ArrowLeft, Calendar, Euro, Percent, Users, LayoutGrid, List, FileText, Globe, Send, History, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import DodajPozicijuModal from '@/components/DodajPozicijuModal';
import Link from 'next/link';
import { generirajUgovorPdfDatoteka } from '@/lib/pdf/generirajUgovorPdf';
import type { KlijentAktivnost, KlijentDetalji, PozicijaDetalji, UgovorDokument } from '@/lib/types/klijenti';
import { revalidateCachePaths } from '@/lib/client/revalidateCache';
import PosaljiUgovorModal from '@/components/klijenti/PosaljiUgovorModal';

// Pomoćna funkcija za striktni HR format datuma
const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  const dan = d.getDate().toString().padStart(2, '0');
  const mjesec = (d.getMonth() + 1).toString().padStart(2, '0');
  const godina = d.getFullYear();
  return `${dan}.${mjesec}.${godina}.`;
};

const formatirajDatumVrijeme = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  const dan = d.getDate().toString().padStart(2, '0');
  const mjesec = (d.getMonth() + 1).toString().padStart(2, '0');
  const godina = d.getFullYear();
  const sati = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${dan}.${mjesec}.${godina}. ${sati}:${minute}`;
};

const normalizirajStatusPotrebe = (status?: string | null) => {
  if ((status || '').toLowerCase() === 'zatvoreno') return 'Zatvoreno';
  return 'Otvoreno';
};

const dobijBojuStatusaPotrebe = (status: string) => {
  return status === 'Zatvoreno'
    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40'
    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40';
};

const formatirajTipRadnika = (tipRadnika?: string | null) => {
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

const formatirajNacionalnosti = (nacionalnosti?: string[] | null) => {
  if (!Array.isArray(nacionalnosti) || nacionalnosti.length === 0) return '-';
  return nacionalnosti.join(', ');
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
};

const PRIKAZ_POTREBA_STORAGE_KEY = 'hr-klijent-potrebe-prikaz';

interface ToastPoruka {
  tip: 'uspjeh' | 'greska';
  tekst: string;
}

interface UgovoriResponse {
  ugovori?: UgovorDokument[];
  error?: string;
}

interface AktivnostiResponse {
  aktivnosti?: KlijentAktivnost[];
  error?: string;
}

interface Props {
  id: string;
  initialKlijent: KlijentDetalji | null;
  initialPozicije: PozicijaDetalji[];
  greska?: string | null;
}

export default function KlijentDetaljiClientView({
  id,
  initialKlijent,
  initialPozicije,
  greska = null,
}: Props) {
  const router = useRouter();
  
  const klijent = initialKlijent;
  const [pozicije, setPozicije] = useState<PozicijaDetalji[]>(initialPozicije);
  const [modalOtvoren, setModalOtvoren] = useState(false);
  const [toastPoruka, setToastPoruka] = useState<ToastPoruka | null>(null);
  const [odabranePozicije, setOdabranePozicije] = useState<string[]>([]);
  const [ugovori, setUgovori] = useState<UgovorDokument[]>([]);
  const [ucitavanjeUgovora, setUcitavanjeUgovora] = useState(false);
  const [brisanjeUgovoraId, setBrisanjeUgovoraId] = useState<string | null>(null);
  const [modalPosaljiOtvoren, setModalPosaljiOtvoren] = useState(false);
  const [odabraniUgovorZaSlanje, setOdabraniUgovorZaSlanje] = useState<string | null>(null);
  const [aktivnosti, setAktivnosti] = useState<KlijentAktivnost[]>([]);
  const [ucitavanjeAktivnosti, setUcitavanjeAktivnosti] = useState(false);
  const [logOtvoren, setLogOtvoren] = useState(false);
  const [emailUgovori, setEmailUgovori] = useState(klijent?.email_ugovori || '');
  const [spremanjeEmaila, setSpremanjeEmaila] = useState(false);
  
  const [prikaz, setPrikaz] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem(PRIKAZ_POTREBA_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  });

  useEffect(() => {
    if (!toastPoruka) return;
    const timer = setTimeout(() => setToastPoruka(null), 3500);
    return () => clearTimeout(timer);
  }, [toastPoruka]);

  useEffect(() => {
    setPozicije(initialPozicije);
    setOdabranePozicije((trenutne) => trenutne.filter((pozicijaId) => initialPozicije.some((p) => p.id === pozicijaId)));
  }, [initialPozicije]);

  useEffect(() => {
    setEmailUgovori(klijent?.email_ugovori || '');
  }, [klijent?.email_ugovori]);

  const dohvatiUgovore = async () => {
    setUcitavanjeUgovora(true);
    try {
      const response = await fetch(`/api/ugovori?klijentId=${encodeURIComponent(id)}`);
      const data = (await response.json()) as UgovoriResponse;
      if (!response.ok) {
        throw new Error(data.error || 'Ne mogu dohvatiti ugovore.');
      }
      setUgovori(data.ugovori || []);
    } catch (error) {
      console.error(error);
      setToastPoruka({ tip: 'greska', tekst: 'Ne mogu dohvatiti datoteke ugovora.' });
    } finally {
      setUcitavanjeUgovora(false);
    }
  };

  const dohvatiAktivnosti = async () => {
    setUcitavanjeAktivnosti(true);
    try {
      const response = await fetch(`/api/klijenti/${encodeURIComponent(id)}/aktivnosti`);
      const data = (await response.json()) as AktivnostiResponse;
      if (!response.ok) {
        throw new Error(data.error || 'Ne mogu dohvatiti aktivnosti.');
      }
      setAktivnosti(data.aktivnosti || []);
    } catch (error) {
      console.error(error);
      setToastPoruka({ tip: 'greska', tekst: 'Ne mogu dohvatiti log aktivnosti.' });
    } finally {
      setUcitavanjeAktivnosti(false);
    }
  };

  useEffect(() => {
    void dohvatiUgovore();
    void dohvatiAktivnosti();
  }, [id]);

  const obrisiUgovor = async (ugovorId: string) => {
    const ugovor = ugovori.find((stavka) => stavka.id === ugovorId);
    const confirmed = window.confirm(
      `Jeste li sigurni da zelite obrisati ugovor${ugovor?.naziv_datoteke ? ` "${ugovor.naziv_datoteke}"` : ''}?`
    );
    if (!confirmed) return;

    setBrisanjeUgovoraId(ugovorId);
    try {
      const response = await fetch(`/api/ugovori/${encodeURIComponent(ugovorId)}`, {
        method: 'DELETE',
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Brisanje ugovora nije uspjelo.');
      }

      if (odabraniUgovorZaSlanje === ugovorId) {
        setOdabraniUgovorZaSlanje(null);
      }
      setToastPoruka({ tip: 'uspjeh', tekst: 'Ugovor je obrisan iz aplikacije i Google Drivea.' });
      await dohvatiUgovore();
      await dohvatiAktivnosti();
    } catch (error) {
      console.error('Greska pri brisanju ugovora:', error);
      setToastPoruka({
        tip: 'greska',
        tekst: error instanceof Error ? error.message : 'Ne mogu obrisati ugovor.',
      });
    } finally {
      setBrisanjeUgovoraId(null);
    }
  };

  const promijeniStatusPotrebe = async (pozicijaId: string, noviStatus: 'Otvoreno' | 'Zatvoreno') => {
    const prethodnePozicije = pozicije;
    setPozicije((trenutne) =>
      trenutne.map((pozicija) => (pozicija.id === pozicijaId ? { ...pozicija, status: noviStatus } : pozicija))
    );

    const { error } = await supabase.from('pozicije').update({ status: noviStatus }).eq('id', pozicijaId);
    if (error) {
      setToastPoruka({ tip: 'greska', tekst: 'Došlo je do greške pri promjeni statusa potrebe.' });
      setPozicije(prethodnePozicije);
      return;
    }

    const revalidated = await revalidateCachePaths(['/klijenti', `/klijenti/${id}`]);
    if (!revalidated) {
      setToastPoruka({
        tip: 'greska',
        tekst: 'Status je spremljen, ali cache se nije osvježio. Osvježavam prikaz.',
      });
    }

    router.refresh();
  };

  const promijeniPrikazPotreba = (noviPrikaz: 'cards' | 'table') => {
    setPrikaz(noviPrikaz);
    window.localStorage.setItem(PRIKAZ_POTREBA_STORAGE_KEY, noviPrikaz);
  };

  const generirajUgovorPDF = async () => {
    if (!klijent || odabranePozicije.length === 0) return;

    setToastPoruka({ tip: 'uspjeh', tekst: 'Generiram ugovor, molimo pričekajte...' });

    const pozicijeZaUgovor = pozicije.filter((pozicija) => odabranePozicije.includes(pozicija.id));

    try {
      const rezultat = await generirajUgovorPdfDatoteka({
        klijent: {
          nazivTvrtke: klijent.naziv_tvrtke,
          oib: klijent.oib,
          ulica: klijent.ulica,
          grad: klijent.grad,
        },
        pozicije: pozicijeZaUgovor.map((pozicija) => ({
          nazivPozicije: pozicija.naziv_pozicije,
          brojIzvrsitelja: pozicija.broj_izvrsitelja,
          cijenaPoKandidatu: pozicija.cijena_po_kandidatu,
          avansDogovoren: pozicija.avans_dogovoren,
          avansPostotak: pozicija.avans_postotak,
        })),
        spremiLokalno: false,
      });

      const response = await fetch('/api/ugovori/spremi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klijentId: id,
          pozicijaIds: pozicijeZaUgovor.map((pozicija) => pozicija.id),
          nazivDatoteke: rezultat.nazivDatoteke,
          pdfBase64: bytesToBase64(rezultat.pdfBytes),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Spremanje ugovora nije uspjelo.');
      }

      setToastPoruka({ tip: 'uspjeh', tekst: 'Ugovor je generiran i spremljen u datoteke.' });
      setOdabranePozicije([]);
      await dohvatiUgovore();
      await dohvatiAktivnosti();
    } catch (error) {
      console.error('Greška pri generiranju ugovora:', error);
      setToastPoruka({
        tip: 'greska',
        tekst:
          error instanceof Error
            ? error.message
            : 'Došlo je do greške pri generiranju i spremanju PDF ugovora.',
      });
    }
  };

  const spremiEmailZaUgovore = async () => {
    if (!klijent) return;
    setSpremanjeEmaila(true);
    const vrijednost = emailUgovori.trim();
    const { error } = await supabase
      .from('klijenti')
      .update({ email_ugovori: vrijednost || null })
      .eq('id', klijent.id);

    if (error) {
      setToastPoruka({ tip: 'greska', tekst: 'Ne mogu spremiti email za ugovore.' });
      setSpremanjeEmaila(false);
      return;
    }

    setToastPoruka({ tip: 'uspjeh', tekst: 'Email za ugovore je spremljen.' });
    setSpremanjeEmaila(false);
    router.refresh();
  };

  const otvorenePozicije = pozicije.filter(
    (pozicija) => normalizirajStatusPotrebe(pozicija.status) === 'Otvoreno'
  );
  const zatvorenePozicije = pozicije.filter(
    (pozicija) => normalizirajStatusPotrebe(pozicija.status) === 'Zatvoreno'
  );

  const togglePozicija = (id: string) => {
    setOdabranePozicije(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const osvjeziNakonPromjenePotreba = () => {
    router.refresh();
    void dohvatiAktivnosti();
  };

  const renderPotrebeKartice = (listaPotreba: PozicijaDetalji[]) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {listaPotreba.map((pozicija) => {
        const statusPotrebe = normalizirajStatusPotrebe(pozicija.status);
        const avansPostotak = pozicija.avans_postotak ?? 0;
        const jeOdabrana = odabranePozicije.includes(pozicija.id);

        return (
          <div key={pozicija.id} className={`bg-white dark:bg-[#0A2B50] rounded-2xl p-6 shadow-sm border ${jeOdabrana ? 'border-brand-navy dark:border-brand-yellow ring-1 ring-brand-navy dark:ring-brand-yellow' : 'border-gray-100 dark:border-gray-800 hover:border-brand-yellow/50 dark:hover:border-brand-yellow/50'} transition-all group relative overflow-hidden`}>
            
            <div className="absolute top-6 left-6 z-10">
              <input 
                type="checkbox" 
                checked={jeOdabrana}
                onChange={() => togglePozicija(pozicija.id)}
                className="w-5 h-5 rounded border-gray-300 text-brand-navy focus:ring-brand-navy cursor-pointer"
                title="Odaberi za ugovor"
              />
            </div>

            <div className="absolute top-6 right-6">
              <select
                value={statusPotrebe}
                onChange={(e) => promijeniStatusPotrebe(pozicija.id, e.target.value as 'Otvoreno' | 'Zatvoreno')}
                className={`appearance-none cursor-pointer outline-none font-bold text-xs uppercase tracking-wide rounded-full px-4 py-1.5 border transition-all ${dobijBojuStatusaPotrebe(statusPotrebe)}`}
              >
                <option value="Otvoreno">Otvoreno</option>
                <option value="Zatvoreno">Zatvoreno</option>
              </select>
            </div>
            
            <h3 className="text-xl font-bold mb-5 pl-8 pr-36">
              <Link
                href={`/pozicije/${pozicija.id}`}
                className="text-brand-navy dark:text-white hover:text-brand-yellow transition-colors"
              >
                {pozicija.naziv_pozicije}
              </Link>
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Users size={16} /></div>
                <span className="text-gray-600 dark:text-gray-300">Traženo kandidata: <strong className="text-brand-navy dark:text-white">{pozicija.broj_izvrsitelja}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Globe size={16} /></div>
                <span className="text-gray-600 dark:text-gray-300">Tip radnika: <strong className="text-brand-navy dark:text-white">{formatirajTipRadnika(pozicija.tip_radnika)}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Globe size={16} /></div>
                <span className="text-gray-600 dark:text-gray-300">Nacionalnosti: <strong className="text-brand-navy dark:text-white">{formatirajNacionalnosti(pozicija.nacionalnosti)}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Calendar size={16} /></div>
                <span className="text-gray-600 dark:text-gray-300">Datum upisa: <strong className="text-brand-navy dark:text-white">{formatirajDatum(pozicija.datum_upisa)}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Euro size={16} /></div>
                <span className="text-gray-600 dark:text-gray-300">Cijena po kandidatu: <strong className="text-brand-navy dark:text-white">{pozicija.cijena_po_kandidatu} €</strong></span>
              </div>
              {pozicija.avans_dogovoren && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-orange"><Percent size={16} /></div>
                  <span className="text-gray-600 dark:text-gray-300">Dogovoren avans: <strong className="text-brand-orange">{avansPostotak}%</strong> <span className="text-xs text-gray-400">({((pozicija.cijena_po_kandidatu * avansPostotak) / 100).toFixed(2)} €/osobi)</span></span>
                </div>
              )}
            </div>
            <Link
              href={`/pozicije/${pozicija.id}`}
              className="w-full flex justify-center py-2.5 bg-gray-50 dark:bg-[#05182d] hover:bg-gray-100 dark:hover:bg-[#07213E] text-brand-navy dark:text-white font-medium rounded-xl transition-colors border border-gray-100 dark:border-gray-700"
            >
              Upravljaj kandidatima
            </Link>
          </div>
        );
      })}
    </div>
  );

  const renderPotrebeTablica = (listaPotreba: PozicijaDetalji[]) => (
    <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
              <th className="py-4 px-6 w-10"></th>
              <th className="py-4 px-6">Radno mjesto</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Tip radnika</th>
              <th className="py-4 px-6">Nacionalnosti</th>
              <th className="py-4 px-6 text-center">Broj radnika</th>
              <th className="py-4 px-6">Cijena</th>
              <th className="py-4 px-6">Avans</th>
              <th className="py-4 px-6">Datum upisa</th>
              <th className="py-4 px-6 text-right">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {listaPotreba.map((pozicija) => {
              const statusPotrebe = normalizirajStatusPotrebe(pozicija.status);
              const avansPostotak = pozicija.avans_postotak ?? 0;
              const jeOdabrana = odabranePozicije.includes(pozicija.id);

              return (
                <tr key={pozicija.id} className={`hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group ${jeOdabrana ? 'bg-blue-50/30 dark:bg-yellow-900/10' : ''}`}>
                  
                  <td className="py-4 px-6">
                    <input 
                      type="checkbox" 
                      checked={jeOdabrana}
                      onChange={() => togglePozicija(pozicija.id)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy cursor-pointer"
                      title="Odaberi za ugovor"
                    />
                  </td>

                  <td className="py-4 px-6 font-semibold">
                    <Link
                      href={`/pozicije/${pozicija.id}`}
                      className="text-brand-navy dark:text-white hover:text-brand-yellow transition-colors"
                    >
                      {pozicija.naziv_pozicije}
                    </Link>
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={statusPotrebe}
                      onChange={(e) => promijeniStatusPotrebe(pozicija.id, e.target.value as 'Otvoreno' | 'Zatvoreno')}
                      className={`appearance-none cursor-pointer outline-none font-bold text-xs uppercase tracking-wide rounded-full px-4 py-1.5 border transition-all ${dobijBojuStatusaPotrebe(statusPotrebe)}`}
                    >
                      <option value="Otvoreno">Otvoreno</option>
                      <option value="Zatvoreno">Zatvoreno</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-medium">
                    {formatirajTipRadnika(pozicija.tip_radnika)}
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">
                    {formatirajNacionalnosti(pozicija.nacionalnosti)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-gray-600 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-[#05182d] border border-transparent dark:border-gray-700 px-3 py-1 rounded-lg">
                      {pozicija.broj_izvrsitelja}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-brand-navy dark:text-gray-200 font-medium">
                    {pozicija.cijena_po_kandidatu} €
                  </td>
                  <td className="py-4 px-6">
                    {pozicija.avans_dogovoren ? (
                      <span className="text-brand-orange font-medium">
                        {avansPostotak}% <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({((pozicija.cijena_po_kandidatu * avansPostotak) / 100).toFixed(2)}€)</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-400 text-sm">
                    {formatirajDatum(pozicija.datum_upisa)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/pozicije/${pozicija.id}`}
                      className="text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                    >
                      Upravljaj &rarr;
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (greska) return <div className="p-8 text-red-500">{greska}</div>;
  if (!klijent) return <div className="p-8 text-red-500">Klijent nije pronađen.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {toastPoruka && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toastPoruka.tip === 'greska'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60'
            }`}
          >
            {toastPoruka.tekst}
          </div>
        </div>
      )}
      
      {/* Navigacija unatrag */}
      <button onClick={() => router.push('/klijenti')} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors font-medium">
        <ArrowLeft size={20} /> Natrag na popis klijenata
      </button>

      {/* SEKCIJA 1: Podaci o klijentu */}
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-colors">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy dark:text-white">{klijent.naziv_tvrtke}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">{klijent.skraceni_naziv}</p>
          </div>
          <span className="px-4 py-2 bg-brand-navy/5 dark:bg-brand-yellow/10 text-brand-navy dark:text-brand-yellow font-semibold rounded-xl border border-brand-navy/10 dark:border-brand-yellow/20">
            {klijent.industrija || 'Industrija nepoznata'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-4">
            <div className="p-3 bg-gray-50 dark:bg-[#05182d] rounded-xl text-brand-yellow h-fit"><Building2 size={24} /></div>
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Pravni podaci</p>
              <p className="font-medium text-brand-navy dark:text-gray-200 mt-1">OIB: {klijent.oib}</p>
              <p className="font-medium text-brand-navy dark:text-gray-200">MBS: {klijent.mbs || '-'}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-gray-50 dark:bg-[#05182d] rounded-xl text-brand-yellow h-fit"><MapPin size={24} /></div>
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Sjedište</p>
              <p className="font-medium text-brand-navy dark:text-gray-200 mt-1">{klijent.ulica}</p>
              <p className="font-medium text-brand-navy dark:text-gray-200">{klijent.grad}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-gray-50 dark:bg-[#05182d] rounded-xl text-brand-yellow h-fit"><FileText size={24} /></div>
            <div className="w-full">
              <p className="text-sm text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Email za ugovore</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  value={emailUgovori}
                  onChange={(e) => setEmailUgovori(e.target.value)}
                  placeholder="pravna@tvrtka.hr"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-sm text-brand-navy dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void spremiEmailZaUgovore()}
                  disabled={spremanjeEmaila}
                  className="px-3 py-2 text-sm rounded-lg bg-brand-orange hover:bg-brand-yellow text-white transition-colors disabled:opacity-60"
                >
                  {spremanjeEmaila ? 'Spremam...' : 'Spremi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEKCIJA 2: Otvorene potrebe / Pozicije */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Briefcase className="text-brand-yellow" /> Potrebe
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Popis otvorenih i zatvorenih potreba klijenta</p>
          </div>
          
          {/* Kontrole */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* GUMB ZA UGOVOR */}
            {odabranePozicije.length > 0 && (
              <button 
                onClick={generirajUgovorPDF}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-navy hover:bg-[#07213E] dark:bg-brand-yellow dark:hover:bg-yellow-500 text-white dark:text-brand-navy px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
              >
                <FileText size={20} /> Generiraj ugovor ({odabranePozicije.length})
              </button>
            )}
            
            {pozicije.length > 0 && (
              <div className="flex bg-white dark:bg-[#0A2B50] rounded-xl p-1 border border-gray-200 dark:border-gray-800 shadow-sm">
                <button
                  onClick={() => promijeniPrikazPotreba('cards')}
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
                  onClick={() => promijeniPrikazPotreba('table')}
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
            )}
            
            <button 
              onClick={() => setModalOtvoren(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus size={20} /> Dodaj potrebu
            </button>
          </div>
        </div>

        {pozicije.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed transition-colors">
            <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-brand-navy dark:text-white">Trenutno nema potreba</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kliknite na gumb iznad kako biste dodali prvo radno mjesto.</p>
          </div>
        ) : prikaz === 'cards' ? (
          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-bold text-brand-navy dark:text-white mb-4">Otvorene potrebe</h3>
              {otvorenePozicije.length > 0 ? (
                renderPotrebeKartice(otvorenePozicije)
              ) : (
                <div className="text-center py-10 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed transition-colors">
                  <p className="text-gray-500 dark:text-gray-400">Trenutno nema otvorenih potreba.</p>
                </div>
              )}
            </div>

            {zatvorenePozicije.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Zatvorene potrebe</h3>
                {renderPotrebeKartice(zatvorenePozicije)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-brand-navy dark:text-white mb-4">Otvorene potrebe</h3>
              {otvorenePozicije.length > 0 ? (
                renderPotrebeTablica(otvorenePozicije)
              ) : (
                <div className="text-center py-10 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed transition-colors">
                  <p className="text-gray-500 dark:text-gray-400">Trenutno nema otvorenih potreba.</p>
                </div>
              )}
            </div>

            {zatvorenePozicije.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Zatvorene potrebe</h3>
                {renderPotrebeTablica(zatvorenePozicije)}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <FileText className="text-brand-yellow" /> Datoteke
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Generirani ugovori za ovog klijenta</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOdabraniUgovorZaSlanje(ugovori[0]?.id || null);
              setModalPosaljiOtvoren(true);
            }}
            disabled={ugovori.length === 0}
            className="flex items-center gap-2 bg-brand-navy hover:bg-[#07213E] dark:bg-brand-yellow dark:hover:bg-yellow-500 text-white dark:text-brand-navy px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Send size={18} /> Pošalji ugovor
          </button>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          {ucitavanjeUgovora ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Učitavam ugovore...</div>
          ) : ugovori.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
              Još nema spremljenih ugovora. Generiraj ugovor iz odabranih potreba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                    <th className="py-4 px-6">Naziv</th>
                    <th className="py-4 px-6">Povezane pozicije</th>
                    <th className="py-4 px-6">Datum</th>
                    <th className="py-4 px-6 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ugovori.map((ugovor) => {
                    const pregledLink =
                      ugovor.drive_web_view_link ||
                      `https://drive.google.com/file/d/${encodeURIComponent(ugovor.drive_file_id)}/view`;
                    const preuzmiLink =
                      ugovor.drive_download_link ||
                      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(ugovor.drive_file_id)}`;
                    return (
                      <tr key={ugovor.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-semibold text-brand-navy dark:text-white">
                          {ugovor.naziv_datoteke}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                          {ugovor.pozicije_nazivi?.length ? ugovor.pozicije_nazivi.join(', ') : '-'}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          {formatirajDatum(ugovor.created_at)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2 text-sm">
                            <a
                              href={pregledLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                            >
                              Pregled
                            </a>
                            <a
                              href={preuzmiLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                            >
                              <Download size={13} />
                              Preuzmi
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setOdabraniUgovorZaSlanje(ugovor.id);
                                setModalPosaljiOtvoren(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-navy/10 dark:bg-brand-yellow/15 text-brand-navy dark:text-brand-yellow hover:text-brand-orange transition-colors font-medium"
                            >
                              Pošalji ugovor
                            </button>
                            <button
                              type="button"
                              onClick={() => void obrisiUgovor(ugovor.id)}
                              disabled={brisanjeUgovoraId === ugovor.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              {brisanjeUgovoraId === ugovor.id ? 'Brišem...' : 'Obriši'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <History className="text-brand-yellow" /> Log
          </h2>
          <button
            type="button"
            onClick={() => setLogOtvoren((prethodno) => !prethodno)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors text-sm font-medium"
          >
            {logOtvoren ? (
              <>
                <ChevronDown size={15} />
                Sakrij log
              </>
            ) : (
              <>
                <ChevronRight size={15} />
                Prikaži log
              </>
            )}
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">Aktivnosti nad klijentom, potrebama i ugovorima</p>

        {!logOtvoren ? (
          <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
            Log je skupljen.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            {ucitavanjeAktivnosti ? (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Učitavam log aktivnosti...</div>
            ) : aktivnosti.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Još nema zabilježenih aktivnosti.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                      <th className="py-3 px-6">Datum i vrijeme</th>
                      <th className="py-3 px-6">User</th>
                      <th className="py-3 px-6">Opis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {aktivnosti.map((aktivnost) => (
                      <tr key={aktivnost.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-6 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {formatirajDatumVrijeme(aktivnost.event_at)}
                        </td>
                        <td className="py-3 px-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-[#05182d] text-xs text-gray-600 dark:text-gray-300">
                            {aktivnost.user_label || 'Sustav'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-sm text-brand-navy dark:text-white">{aktivnost.opis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOtvoren && (
        <DodajPozicijuModal 
          klijentId={id}
          zatvoriModal={() => setModalOtvoren(false)} 
          osvjeziListu={osvjeziNakonPromjenePotreba} 
        />
      )}
      <PosaljiUgovorModal
        otvoren={modalPosaljiOtvoren}
        zatvoriModal={() => setModalPosaljiOtvoren(false)}
        ugovori={ugovori}
        klijentNaziv={klijent.naziv_tvrtke}
        defaultTo={emailUgovori}
        odabraniUgovorId={odabraniUgovorZaSlanje}
        onPoslano={() => {
          setToastPoruka({ tip: 'uspjeh', tekst: 'Ugovor je uspješno poslan.' });
          void dohvatiAktivnosti();
        }}
      />
    </div>
  );
}
