'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Calculator } from 'lucide-react';

interface Props {
  klijentId: string;
  zatvoriModal: () => void;
  osvjeziListu: () => void;
}

export default function DodajPozicijuModal({ klijentId, zatvoriModal, osvjeziListu }: Props) {
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState('');
  
  const [formData, setFormData] = useState({
    naziv_pozicije: '',
    broj_izvrsitelja: '1', // Promijenjeno u string kako bismo mogli obrisati broj
    datum_upisa: new Date().toISOString().split('T')[0],
    cijena_po_kandidatu: '',
    avans_dogovoren: false,
    avans_postotak: '',
  });

  // Funkcija za automatski izračun avansa u eurima
  const izracunajIznosAvansa = () => {
    const cijena = parseFloat(formData.cijena_po_kandidatu);
    const postotak = parseFloat(formData.avans_postotak);
    if (!isNaN(cijena) && !isNaN(postotak)) {
      return ((cijena * postotak) / 100).toFixed(2);
    }
    return '0.00';
  };

  const spremiPoziciju = async () => {
    if (!formData.naziv_pozicije || !formData.cijena_po_kandidatu) {
      setGreska('Molimo ispunite naziv pozicije i cijenu.');
      return;
    }

    setSpremanje(true);
    const { error } = await supabase.from('pozicije').insert([{
      klijent_id: klijentId,
      naziv_pozicije: formData.naziv_pozicije,
      broj_izvrsitelja: parseInt(formData.broj_izvrsitelja) || 1, // Osiguravamo da je barem 1 ako se ostavi prazno na kraju
      datum_upisa: formData.datum_upisa,
      cijena_po_kandidatu: parseFloat(formData.cijena_po_kandidatu),
      avans_dogovoren: formData.avans_dogovoren,
      avans_postotak: formData.avans_dogovoren ? parseFloat(formData.avans_postotak) : null,
      status: 'Otvoreno'
    }]);

    if (error) {
      setGreska('Greška pri spremanju pozicije.');
      setSpremanje(false);
    } else {
      osvjeziListu();
      zatvoriModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Nova potreba</h2>
          <button onClick={zatvoriModal} className="text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {greska && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
              {greska}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Ime radnog mjesta</label>
            <input 
              type="text" 
              placeholder="Npr. Građevinski radnik"
              value={formData.naziv_pozicije} 
              onChange={(e) => setFormData({...formData, naziv_pozicije: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Broj kandidata</label>
              <input 
                type="number" 
                min="1"
                value={formData.broj_izvrsitelja} 
                onChange={(e) => setFormData({...formData, broj_izvrsitelja: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Datum upisa</label>
              <input 
                type="date" 
                value={formData.datum_upisa} 
                onChange={(e) => setFormData({...formData, datum_upisa: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Ugovorena cijena po kandidatu (€)</label>
            <input 
              type="number" 
              placeholder="Npr. 500"
              value={formData.cijena_po_kandidatu} 
              onChange={(e) => setFormData({...formData, cijena_po_kandidatu: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-[#05182d] rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.avans_dogovoren}
                onChange={(e) => setFormData({...formData, avans_dogovoren: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange accent-brand-orange"
              />
              <span className="font-semibold text-brand-navy dark:text-gray-300">Dogovoren je avans</span>
            </label>
            
            {formData.avans_dogovoren && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Postotak avansa (%)</label>
                    <input 
                      type="number" 
                      placeholder="Npr. 30"
                      min="1" max="100"
                      value={formData.avans_postotak} 
                      onChange={(e) => setFormData({...formData, avans_postotak: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Iznos avansa</label>
                    <div className="w-full px-4 py-2.5 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-brand-navy dark:text-white font-bold flex items-center justify-between">
                      <span>{izracunajIznosAvansa()} €</span>
                      <Calculator size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#07213E] flex justify-end gap-3 rounded-b-2xl">
          <button onClick={zatvoriModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-brand-navy dark:hover:text-white transition-colors">Odustani</button>
          <button 
            onClick={spremiPoziciju}
            disabled={spremanje || !formData.naziv_pozicije || !formData.cijena_po_kandidatu}
            className="bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {spremanje && <Loader2 size={18} className="animate-spin" />}
            Spremi potrebu
          </button>
        </div>

      </div>
    </div>
  );
}