'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Building2, MapPin, Briefcase, Plus, ArrowLeft, Calendar, Euro, Percent, Users, LayoutGrid, List, FileText } from 'lucide-react';
import DodajPozicijuModal from '@/components/DodajPozicijuModal';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

// Pomoćna funkcija za striktni HR format datuma
const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  const dan = d.getDate().toString().padStart(2, '0');
  const mjesec = (d.getMonth() + 1).toString().padStart(2, '0');
  const godina = d.getFullYear();
  return `${dan}.${mjesec}.${godina}.`;
};

// Pomoćna funkcija za pretvaranje fonta u Base64 format za jsPDF (Potrebno za dijakritičke znakove)
const pretvoriUBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
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

const PRIKAZ_POTREBA_STORAGE_KEY = 'hr-klijent-potrebe-prikaz';

interface Klijent {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  industrija: string | null;
  oib: string;
  mbs: string | null;
  ulica: string | null;
  grad: string | null;
}

interface Pozicija {
  id: string;
  klijent_id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  datum_upisa: string;
  cijena_po_kandidatu: number;
  avans_dogovoren: boolean;
  avans_postotak: number | null;
  status: string | null;
}

interface ToastPoruka {
  tip: 'uspjeh' | 'greska';
  tekst: string;
}

export default function KlijentDetaljiPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [klijent, setKlijent] = useState<Klijent | null>(null);
  const [pozicije, setPozicije] = useState<Pozicija[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [modalOtvoren, setModalOtvoren] = useState(false);
  const [toastPoruka, setToastPoruka] = useState<ToastPoruka | null>(null);
  const [odabranePozicije, setOdabranePozicije] = useState<string[]>([]);
  
  const [prikaz, setPrikaz] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem(PRIKAZ_POTREBA_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  });

  const dohvatiPodatke = useCallback(async () => {
    const { data: klijentData } = await supabase.from('klijenti').select('*').eq('id', id).single();
    const { data: pozicijeData } = await supabase.from('pozicije').select('*').eq('klijent_id', id).order('created_at', { ascending: false });
    
    setKlijent(klijentData as Klijent | null);
    setPozicije((pozicijeData || []) as Pozicija[]);
    setUcitavanje(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void dohvatiPodatke();
  }, [id, dohvatiPodatke]);

  useEffect(() => {
    if (!toastPoruka) return;
    const timer = setTimeout(() => setToastPoruka(null), 3500);
    return () => clearTimeout(timer);
  }, [toastPoruka]);

  const promijeniStatusPotrebe = async (pozicijaId: string, noviStatus: 'Otvoreno' | 'Zatvoreno') => {
    setPozicije((trenutne) =>
      trenutne.map((pozicija) => (pozicija.id === pozicijaId ? { ...pozicija, status: noviStatus } : pozicija))
    );

    const { error } = await supabase.from('pozicije').update({ status: noviStatus }).eq('id', pozicijaId);
    if (error) {
      setToastPoruka({ tip: 'greska', tekst: 'Došlo je do greške pri promjeni statusa potrebe.' });
      dohvatiPodatke();
    }
  };

  const promijeniPrikazPotreba = (noviPrikaz: 'cards' | 'table') => {
    setPrikaz(noviPrikaz);
    window.localStorage.setItem(PRIKAZ_POTREBA_STORAGE_KEY, noviPrikaz);
  };

  // --- NOVA FUNKCIJA SA OPEN SANS FONTOVIMA ---
  const generirajUgovorPDF = async () => {
    if (!klijent || odabranePozicije.length === 0) return;

    setToastPoruka({ tip: 'uspjeh', tekst: 'Generiram ugovor, molimo pričekajte...' });

    const pozicijeZaUgovor = pozicije.filter(p => odabranePozicije.includes(p.id));
    const doc = new jsPDF();

    try {
      // 1. Učitavanje Regular fonta
      const resRegular = await fetch('/fonts/OpenSans-Regular.ttf');
      const bufferRegular = await resRegular.arrayBuffer();
      const base64Regular = pretvoriUBase64(bufferRegular);
      doc.addFileToVFS('OpenSans-Regular.ttf', base64Regular);
      doc.addFont('OpenSans-Regular.ttf', 'OpenSans', 'normal');

      // 2. Učitavanje Bold fonta
      const resBold = await fetch('/fonts/OpenSans-Bold.ttf');
      const bufferBold = await resBold.arrayBuffer();
      const base64Bold = pretvoriUBase64(bufferBold);
      doc.addFileToVFS('OpenSans-Bold.ttf', base64Bold);
      doc.addFont('OpenSans-Bold.ttf', 'OpenSans', 'bold');
    } catch (error) {
      console.error('Greška pri učitavanju fonta:', error);
      setToastPoruka({ tip: 'greska', tekst: 'Nisam uspio učitati Open Sans font.' });
    }

    let yPos = 20;

    // --- ZAGLAVLJE ---
    doc.setFontSize(16);
    doc.setFont("OpenSans", "bold");
    doc.text("UGOVOR O POSREDOVANJU PRI ZAPOŠLJAVANJU", 105, yPos, { align: "center" });
    
    yPos += 20;
    doc.setFontSize(12);
    doc.setFont("OpenSans", "normal");
    
    // --- PODACI O KLIJENTU ---
    doc.text(`Naručitelj: ${klijent.naziv_tvrtke}`, 20, yPos); yPos += 7;
    doc.text(`OIB: ${klijent.oib}`, 20, yPos); yPos += 7;
    doc.text(`Adresa: ${klijent.ulica || ''}, ${klijent.grad || ''}`, 20, yPos); yPos += 15;

    // --- PREDMET UGOVORA (POZICIJE) ---
    doc.text("Predmet ovog ugovora je posredovanje pri zapošljavanju za sljedeće pozicije:", 20, yPos);
    yPos += 10;

    pozicijeZaUgovor.forEach((poz, index) => {
      doc.setFont("OpenSans", "bold");
      doc.text(`${index + 1}. Pozicija: ${poz.naziv_pozicije}`, 25, yPos); yPos += 7;
      
      doc.setFont("OpenSans", "normal");
      doc.text(`   - Traženi broj izvršitelja: ${poz.broj_izvrsitelja}`, 25, yPos); yPos += 7;
      doc.text(`   - Cijena po kandidatu: ${poz.cijena_po_kandidatu} EUR`, 25, yPos); yPos += 7;
      
      if (poz.avans_dogovoren && poz.avans_postotak) {
        const avansIznos = (poz.cijena_po_kandidatu * poz.avans_postotak) / 100;
        doc.text(`   - Dogovoren avans: ${poz.avans_postotak}% (što iznosi ${avansIznos.toFixed(2)} EUR po osobi)`, 25, yPos); yPos += 7;
      }
      yPos += 5; // Razmak između pozicija
    });

    // --- OSTATAK UGOVORA (Ovdje ubaci svoj standardni tekst) ---
    yPos += 10;
    doc.setFont("OpenSans", "bold");
    doc.text("Članak 2.", 20, yPos); yPos += 7;
    
    doc.setFont("OpenSans", "normal");
    // Ovdje ide dugački tekst ugovora s č, ć, ž, š, đ
    // doc.text("Ovdje ide tvoj dugacki tekst ugovora...", 20, yPos);
    
    // Mjesta za potpis
    yPos += 40;
    doc.text("Za Agenciju:", 40, yPos);
    doc.text("Za Naručitelja:", 140, yPos);

    // Spremanje dokumenta
    const imeDatoteke = `Ugovor_${klijent.naziv_tvrtke.replace(/\s+/g, '_')}.pdf`;
    doc.save(imeDatoteke);
    
    setToastPoruka({ tip: 'uspjeh', tekst: 'Ugovor je uspješno generiran!' });
    setOdabranePozicije([]); // Očisti odabir nakon kreiranja
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

  // Dodana funkcija za kartice koja je nedostajala u poslanom kodu
  const renderPotrebeKartice = (listaPotreba: Pozicija[]) => (
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

  const renderPotrebeTablica = (listaPotreba: Pozicija[]) => (
    <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
              <th className="py-4 px-6 w-10"></th>
              <th className="py-4 px-6">Radno mjesto</th>
              <th className="py-4 px-6">Status</th>
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

  if (ucitavanje) return <div className="p-8 text-gray-500 dark:text-gray-400">Učitavanje podataka o klijentu...</div>;
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

      {modalOtvoren && (
        <DodajPozicijuModal 
          klijentId={id as string} 
          zatvoriModal={() => setModalOtvoren(false)} 
          osvjeziListu={dohvatiPodatke} 
        />
      )}
    </div>
  );
}