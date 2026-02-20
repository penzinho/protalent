'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import DodajKlijentaModal from '@/components/DodajKlijentaModal';

interface Klijent {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string;
  oib: string;
  mbs: string;
  ulica: string;
  grad: string;
  industrija: string;
}

export default function KlijentiPage() {
  const [klijenti, setKlijenti] = useState<Klijent[]>([]);
  const [pretrazivanje, setPretrazivanje] = useState('');
  const [ucitavanje, setUcitavanje] = useState(true);
  const [modalOtvoren, setModalOtvoren] = useState(false);

  useEffect(() => {
    async function dohvatiKlijente() {
      const { data, error } = await supabase.from('klijenti').select('*').order('created_at', { ascending: false });
      if (error) console.error('Greška pri dohvaćanju:', error);
      else setKlijenti(data || []);
      setUcitavanje(false);
    }
    dohvatiKlijente();
  }, []);

  const filtriraniKlijenti = klijenti.filter((klijent) =>
    (klijent.skraceni_naziv || klijent.naziv_tvrtke).toLowerCase().includes(pretrazivanje.toLowerCase()) ||
    klijent.oib.includes(pretrazivanje) ||
    (klijent.industrija && klijent.industrija.toLowerCase().includes(pretrazivanje.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Zaglavlje - tamne boje fontova ažurirane */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Klijenti</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pregled i upravljanje svim klijentima agencije</p>
        </div>
        
        <button 
          onClick={() => setModalOtvoren(true)}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Dodaj novog klijenta</span>
        </button>
      </div>

      {/* Tražilica - ažurirano za dark mode */}
      <div className="bg-white dark:bg-[#0A2B50] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8 transition-colors">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Pretraži po nazivu tvrtke ili OIB-u..."
            value={pretrazivanje}
            onChange={(e) => setPretrazivanje(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-transparent dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>
      </div>

      {ucitavanje ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Učitavanje klijenata...</div>
      ) : (
        <>
          {filtriraniKlijenti.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
              <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-brand-navy dark:text-white">Nema pronađenih klijenata</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Pokušajte promijeniti pretragu ili dodajte novog klijenta.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                      <th className="py-4 px-6">Klijent</th>
                      <th className="py-4 px-6">Industrija</th>
                      <th className="py-4 px-6">Grad</th>
                      <th className="py-4 px-6 text-center">Pozicije</th>
                      <th className="py-4 px-6 text-center">Kandidati</th>
                      <th className="py-4 px-6 text-right">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtriraniKlijenti.map((klijent) => (
                      <tr key={klijent.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-brand-navy dark:text-white">
                            {klijent.skraceni_naziv || klijent.naziv_tvrtke}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">OIB: {klijent.oib}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-navy/5 dark:bg-brand-yellow/10 text-brand-navy dark:text-brand-yellow border border-brand-navy/10 dark:border-brand-yellow/20">
                            {klijent.industrija || 'Nije odabrano'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            {klijent.grad || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-gray-600 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-[#05182d] border border-transparent dark:border-gray-700 px-3 py-1 rounded-lg">0</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-gray-600 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-[#05182d] border border-transparent dark:border-gray-700 px-3 py-1 rounded-lg">0</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link 
                            href={`/klijenti/${klijent.id}`}
                            className="text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                          >
                            Detalji &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {modalOtvoren && (
        <DodajKlijentaModal 
          zatvoriModal={() => setModalOtvoren(false)} 
          osvjeziListu={() => window.location.reload()} 
        />
      )}
    </div>
  );
}