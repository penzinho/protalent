'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Search, Loader2 } from 'lucide-react';
import { revalidateCachePaths } from '@/lib/client/revalidateCache';

interface Props {
  zatvoriModal: () => void;
  osvjeziListu: () => void;
}

export default function DodajKlijentaModal({ zatvoriModal, osvjeziListu }: Props) {
  // ... ZADRŽAVAMO SVE STATEOVE I FUNKCIJE KAO I RANIJE ...
  const [oibUnos, setOibUnos] = useState('');
  const [ucitavanje, setUcitavanje] = useState(false);
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState('');
  
  const [formData, setFormData] = useState({
    naziv_tvrtke: '',
    skraceni_naziv: '',
    mbs: '',
    oib: '',
    ulica: '',
    grad: '',
    industrija: 'Proizvodnja',
    email_ugovori: '',
  });

  const dohvatiPodatke = async () => {
    setGreska('');
    if (oibUnos.length !== 11) {
      setGreska('OIB mora imati točno 11 znamenki.');
      return;
    }
    setUcitavanje(true);
    try {
      const response = await fetch(`/api/sudreg?oib=${oibUnos}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setFormData({
        ...formData,
        naziv_tvrtke: data.naziv_tvrtke,
        skraceni_naziv: data.skraceni_naziv,
        mbs: data.mbs,
        oib: data.oib,
        ulica: data.ulica,
        grad: data.grad,
      });
    } catch (error: any) {
      setGreska(error.message);
    } finally {
      setUcitavanje(false);
    }
  };

  const spremiKlijenta = async () => {
    if (!formData.naziv_tvrtke) {
      setGreska('Prvo dohvatite podatke klijenta.');
      return;
    }
    setSpremanje(true);
    const { error } = await supabase.from('klijenti').insert([formData]);
    if (error) {
      setGreska('Greška pri spremanju. Možda klijent već postoji.');
      setSpremanje(false);
    } else {
      const revalidated = await revalidateCachePaths(['/klijenti']);
      if (!revalidated) {
        console.error('Klijent spremljen, ali revalidate cachea nije uspio za /klijenti.');
      }
      osvjeziListu();
      zatvoriModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* POPRAVLJENI KONTEJNER: flex-col i max-h-[90vh] osiguravaju da se modal ne slomi na malim ekranima */}
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
        {/* Fiksno Zaglavlje */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Dodaj novog klijenta</h2>
          <button onClick={zatvoriModal} className="text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Sadržaj koji se MOŽE skrolati (overflow-y-auto) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {greska && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
              {greska}
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Unesite OIB klijenta</label>
              <input 
                type="text" 
                value={oibUnos} 
                onChange={(e) => setOibUnos(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
                placeholder="Npr. 12345678901"
                maxLength={11}
              />
            </div>
            <button 
              onClick={dohvatiPodatke}
              disabled={ucitavanje}
              className="mt-6 bg-brand-orange text-white px-5 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors flex items-center gap-2 disabled:opacity-70 font-medium shadow-sm"
            >
              {ucitavanje ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Dohvati
            </button>
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-gray-800 my-2"></div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Industrija klijenta</label>
              <select 
                value={formData.industrija}
                onChange={(e) => setFormData({...formData, industrija: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white font-medium"
              >
                <option value="Proizvodnja">Proizvodnja</option>
                <option value="Građevina">Građevina</option>
                <option value="Ugostiteljstvo">Ugostiteljstvo</option>
                <option value="Prijevoz">Prijevoz</option>
                <option value="Logistika">Logistika</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
                Email za ugovore
              </label>
              <input
                type="email"
                placeholder="npr. pravna@tvrtka.hr"
                value={formData.email_ugovori}
                onChange={(e) => setFormData({ ...formData, email_ugovori: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Skraćeni naziv</label>
                <input type="text" readOnly value={formData.skraceni_naziv} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[#05182d]/50 border border-gray-100 dark:border-gray-800 rounded-xl text-brand-navy dark:text-gray-200 font-medium" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 block">OIB</label>
                <input type="text" readOnly value={formData.oib} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[#05182d]/50 border border-gray-100 dark:border-gray-800 rounded-xl text-brand-navy dark:text-gray-200 font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Ulica i broj</label>
                <input type="text" readOnly value={formData.ulica} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[#05182d]/50 border border-gray-100 dark:border-gray-800 rounded-xl text-brand-navy dark:text-gray-200 font-medium line-clamp-1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Grad</label>
                <input type="text" readOnly value={formData.grad} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[#05182d]/50 border border-gray-100 dark:border-gray-800 rounded-xl text-brand-navy dark:text-gray-200 font-medium" />
              </div>
            </div>
          </div>
        </div>

        {/* Fiksno Dno */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#07213E] flex justify-end gap-3 rounded-b-2xl">
          <button onClick={zatvoriModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-brand-navy dark:hover:text-white transition-colors">
            Odustani
          </button>
          <button 
            onClick={spremiKlijenta}
            disabled={spremanje || !formData.skraceni_naziv}
            className="bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {spremanje && <Loader2 size={18} className="animate-spin" />}
            Spremi klijenta
          </button>
        </div>

      </div>
    </div>
  );
}
