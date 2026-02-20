'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Building2, MapPin, Briefcase, Plus, ArrowLeft, Calendar, Euro, Percent, Users, LayoutGrid, List } from 'lucide-react';
import DodajPozicijuModal from '@/components/DodajPozicijuModal';
import Link from 'next/link';

// Pomoćna funkcija za striktni HR format datuma
const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  const dan = d.getDate().toString().padStart(2, '0');
  const mjesec = (d.getMonth() + 1).toString().padStart(2, '0');
  const godina = d.getFullYear();
  return `${dan}.${mjesec}.${godina}.`;
};

export default function KlijentDetaljiPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [klijent, setKlijent] = useState<any>(null);
  const [pozicije, setPozicije] = useState<any[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [modalOtvoren, setModalOtvoren] = useState(false);
  
  // Novi state za upravljanje prikazom (kartice ili tablica)
  const [prikaz, setPrikaz] = useState<'cards' | 'table'>('cards');

  const dohvatiPodatke = async () => {
    setUcitavanje(true);
    const { data: klijentData } = await supabase.from('klijenti').select('*').eq('id', id).single();
    const { data: pozicijeData } = await supabase.from('pozicije').select('*').eq('klijent_id', id).order('created_at', { ascending: false });
    
    setKlijent(klijentData);
    setPozicije(pozicijeData || []);
    setUcitavanje(false);
  };

  useEffect(() => {
    if (id) dohvatiPodatke();
  }, [id]);

  if (ucitavanje) return <div className="p-8 text-gray-500 dark:text-gray-400">Učitavanje podataka o klijentu...</div>;
  if (!klijent) return <div className="p-8 text-red-500">Klijent nije pronađen.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
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
              <Briefcase className="text-brand-yellow" /> Otvorene potrebe
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Popis radnih mjesta i kandidata koje klijent traži</p>
          </div>
          
          {/* Kontrole: Prekidač prikaza + Gumb za dodavanje */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {pozicije.length > 0 && (
              <div className="flex bg-white dark:bg-[#0A2B50] rounded-xl p-1 border border-gray-200 dark:border-gray-800 shadow-sm">
                <button
                  onClick={() => setPrikaz('cards')}
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
                  onClick={() => setPrikaz('table')}
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
            <h3 className="text-lg font-medium text-brand-navy dark:text-white">Trenutno nema otvorenih potreba</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kliknite na gumb iznad kako biste dodali prvo radno mjesto.</p>
          </div>
        ) : prikaz === 'cards' ? (
          /* PRIKAZ KARTICA */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pozicije.map((pozicija) => (
              <div key={pozicija.id} className="bg-white dark:bg-[#0A2B50] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-yellow/50 dark:hover:border-brand-yellow/50 transition-all group relative overflow-hidden">
                <div className="absolute top-6 right-6 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wide">
                  {pozicija.status}
                </div>
                <h3 className="text-xl font-bold text-brand-navy dark:text-white mb-5 pr-24">
                  {pozicija.naziv_pozicije}
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
                      <span className="text-gray-600 dark:text-gray-300">Dogovoren avans: <strong className="text-brand-orange">{pozicija.avans_postotak}%</strong> <span className="text-xs text-gray-400">({((pozicija.cijena_po_kandidatu * pozicija.avans_postotak) / 100).toFixed(2)} €/osobi)</span></span>
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
            ))}
          </div>
        ) : (
          /* PRIKAZ TABLICE */
          <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
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
                  {pozicije.map((pozicija) => (
                    <tr key={pozicija.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-brand-navy dark:text-white">
                        {pozicija.naziv_pozicije}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/30">
                          {pozicija.status}
                        </span>
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
                            {pozicija.avans_postotak}% <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({((pozicija.cijena_po_kandidatu * pozicija.avans_postotak) / 100).toFixed(2)}€)</span>
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
                  ))}
                </tbody>
              </table>
            </div>
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