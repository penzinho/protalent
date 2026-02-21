'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, Euro, Percent, Plus, Save, FileText, Globe, Phone, Mail, ChevronDown } from 'lucide-react';
import DodajKandidataModal from '@/components/DodajKandidataModal';
import { jsPDF } from 'jspdf';

const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`;
};

// Pomoćna funkcija za određivanje boje statusa
const dobijBojuStatusa = (status: string) => {
  switch (status) {
    case 'Poslano klijentu':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
    case 'Dogovoren razgovor':
      return 'bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange dark:text-brand-yellow border-brand-orange/20 dark:border-brand-orange/30';
    case 'Odbijen':
      return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
    case 'Zaposlen':
      return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50';
    default:
      return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

export default function PozicijaDetaljiPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [pozicija, setPozicija] = useState<any>(null);
  const [kandidati, setKandidati] = useState<any[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [modalOtvoren, setModalOtvoren] = useState(false);
  
  const [uvjeti, setUvjeti] = useState('');
  const [spremanjeUvjeta, setSpremanjeUvjeta] = useState(false);

  const dohvatiPodatke = async () => {
    setUcitavanje(true);
    const { data: pozicijaData } = await supabase
      .from('pozicije')
      .select('*, klijenti(id, naziv_tvrtke, oib, ulica, grad)')
      .eq('id', id)
      .single();
    const { data: kandidatiData } = await supabase.from('kandidati').select('*').eq('pozicija_id', id).order('datum_slanja', { ascending: false });
    
    setPozicija(pozicijaData);
    setUvjeti(pozicijaData?.uvjeti_zaposlenja || '');
    setKandidati(kandidatiData || []);
    setUcitavanje(false);
  };

  useEffect(() => {
    if (id) dohvatiPodatke();
  }, [id]);

  const spremiUvjete = async () => {
    setSpremanjeUvjeta(true);
    await supabase.from('pozicije').update({ uvjeti_zaposlenja: uvjeti }).eq('id', id);
    setSpremanjeUvjeta(false);
  };

  const generirajUgovorPDF = () => {
    if (!pozicija) return;

    const klijentNaziv = pozicija.klijenti?.naziv_tvrtke || 'Nepoznati_klijent';
    const klijentOib = pozicija.klijenti?.oib || '-';
    const klijentUlica = pozicija.klijenti?.ulica || '';
    const klijentGrad = pozicija.klijenti?.grad || '';
    const avansPostotak = pozicija.avans_postotak ?? 0;

    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('UGOVOR O POSREDOVANJU PRI ZAPOSLJAVANJU', 105, yPos, { align: 'center' });

    yPos += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    doc.text(`Narucitelj: ${klijentNaziv}`, 20, yPos);
    yPos += 7;
    doc.text(`OIB: ${klijentOib}`, 20, yPos);
    yPos += 7;
    doc.text(`Adresa: ${klijentUlica}, ${klijentGrad}`, 20, yPos);
    yPos += 15;

    doc.text('Predmet ovog ugovora je posredovanje pri zaposljavanju za sljedecu poziciju:', 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`1. Pozicija: ${pozicija.naziv_pozicije}`, 25, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`   - Trazeni broj izvrsitelja: ${pozicija.broj_izvrsitelja}`, 25, yPos);
    yPos += 7;
    doc.text(`   - Cijena po kandidatu: ${pozicija.cijena_po_kandidatu} EUR`, 25, yPos);
    yPos += 7;

    if (pozicija.avans_dogovoren && avansPostotak > 0) {
      const avansIznos = (pozicija.cijena_po_kandidatu * avansPostotak) / 100;
      doc.text(`   - Dogovoren avans: ${avansPostotak}% (sto iznosi ${avansIznos.toFixed(2)} EUR po osobi)`, 25, yPos);
      yPos += 7;
    }

    yPos += 10;
    doc.text('Clanak 2.', 20, yPos);
    yPos += 47;
    doc.text('Za Agenciju:', 40, yPos);
    doc.text('Za Narucitelja:', 140, yPos);

    const siguranKlijent = klijentNaziv.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sigurnaPozicija = (pozicija.naziv_pozicije || 'pozicija').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Ugovor_${siguranKlijent}_${sigurnaPozicija}.pdf`);
  };

  // Nova funkcija za izravnu promjenu statusa u tablici
  const promijeniStatusKandidata = async (kandidatId: string, noviStatus: string) => {
    // 1. Vizualno odmah mijenjamo status u tablici (Optimistic update)
    setKandidati(kandidati.map(k => k.id === kandidatId ? { ...k, status: noviStatus } : k));
    
    // 2. Šaljemo promjenu u bazu podataka
    const { error } = await supabase.from('kandidati').update({ status: noviStatus }).eq('id', kandidatId);
    if (error) {
      alert('Došlo je do greške pri promjeni statusa.');
      dohvatiPodatke(); // Vraćamo na staro ako je greška
    }
  };

  if (ucitavanje) return <div className="p-8 text-gray-500 dark:text-gray-400">Učitavanje pozicije...</div>;
  if (!pozicija) return <div className="p-8 text-red-500">Pozicija nije pronađena.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button onClick={() => router.push(`/klijenti/${pozicija.klijent_id}`)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors font-medium">
          <ArrowLeft size={20} /> Natrag na klijenta ({pozicija.klijenti?.naziv_tvrtke})
        </button>
        <button
          onClick={generirajUgovorPDF}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <FileText size={20} /> Generiraj ugovor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-white">{pozicija.naziv_pozicije}</h1>
              <p className="text-brand-orange mt-1 font-medium">{pozicija.klijenti?.naziv_tvrtke}</p>
            </div>
            <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wide border border-green-200 dark:border-green-800/30">
              {pozicija.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Users size={18} /></div>
              <span className="text-gray-600 dark:text-gray-300">Ukupno traženo: <strong className="text-brand-navy dark:text-white text-base">{pozicija.broj_izvrsitelja} radnika</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Calendar size={18} /></div>
              <span className="text-gray-600 dark:text-gray-300">Datum upisa: <strong className="text-brand-navy dark:text-white">{formatirajDatum(pozicija.datum_upisa)}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow"><Euro size={18} /></div>
              <span className="text-gray-600 dark:text-gray-300">Cijena po osobi: <strong className="text-brand-navy dark:text-white">{pozicija.cijena_po_kandidatu} €</strong></span>
            </div>
            {pozicija.avans_dogovoren && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-orange"><Percent size={18} /></div>
                <span className="text-gray-600 dark:text-gray-300">Avans: <strong className="text-brand-orange">{pozicija.avans_postotak}%</strong> <span className="text-xs">({((pozicija.cijena_po_kandidatu * pozicija.avans_postotak) / 100).toFixed(2)} €/osobi)</span></span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <FileText className="text-brand-yellow" size={20} /> Uvjeti zaposlenja
            </h2>
            <button 
              onClick={spremiUvjete}
              disabled={spremanjeUvjeta}
              className="text-sm flex items-center gap-2 bg-gray-100 dark:bg-[#05182d] hover:bg-gray-200 dark:hover:bg-[#07213E] text-brand-navy dark:text-white px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <Save size={16} /> {spremanjeUvjeta ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
          <textarea 
            value={uvjeti}
            onChange={(e) => setUvjeti(e.target.value)}
            placeholder="Ovdje upišite uvjete (npr. plaća 1200€ neto, osiguran smještaj, plaćen topli obrok, rad u smjenama...)"
            className="w-full flex-1 min-h-[150px] p-4 bg-gray-50 dark:bg-[#05182d] border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white resize-none text-sm leading-relaxed"
          ></textarea>
        </div>

      </div>

      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Users className="text-brand-yellow" /> Poslani kandidati
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Pregled svih kandidata proslijeđenih klijentu za ovu poziciju</p>
          </div>
          <button 
            onClick={() => setModalOtvoren(true)}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus size={20} /> Dodaj kandidata
          </button>
        </div>

        {kandidati.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed transition-colors">
            <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-brand-navy dark:text-white">Još nema poslanih kandidata</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kliknite na gumb iznad i unesite prvog kandidata.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                    <th className="py-4 px-6">Ime i prezime</th>
                    <th className="py-4 px-6">Nacionalnost</th>
                    <th className="py-4 px-6">Kontakt</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Datum slanja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {kandidati.map((kandidat) => (
                    <tr key={kandidat.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6 font-bold text-brand-navy dark:text-white">
                        {kandidat.ime_prezime}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-brand-yellow" />
                          {kandidat.nacionalnost || '-'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {kandidat.email && <div className="flex items-center gap-2"><Mail size={12} /> {kandidat.email}</div>}
                        {kandidat.telefon && <div className="flex items-center gap-2"><Phone size={12} /> {kandidat.telefon}</div>}
                        {(!kandidat.email && !kandidat.telefon) && '-'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {/* NOVI INTERAKTIVNI STATUS SELECTOR */}
                        <div className="relative inline-block">
                          <select
                            value={kandidat.status}
                            onChange={(e) => promijeniStatusKandidata(kandidat.id, e.target.value)}
                            className={`appearance-none cursor-pointer outline-none font-bold text-xs uppercase tracking-wide rounded-full px-4 py-1.5 border transition-all ${dobijBojuStatusa(kandidat.status)} pr-8`}
                          >
                            <option value="Poslano klijentu">Poslan klijentu</option>
                            <option value="Dogovoren razgovor">Dogovoren razgovor</option>
                            <option value="Zaposlen">Zaposlen</option>
                            <option value="Odbijen">Odbijen</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-gray-600 dark:text-gray-400 text-sm font-medium">
                        {formatirajDatum(kandidat.datum_slanja)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOtvoren && (
        <DodajKandidataModal 
          pozicijaId={id as string} 
          zatvoriModal={() => setModalOtvoren(false)} 
          osvjeziListu={dohvatiPodatke} 
        />
      )}
    </div>
  );
}
