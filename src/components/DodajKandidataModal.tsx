'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { toast } from 'sonner';

interface Props {
  pozicijaId: string;
  zatvoriModal: () => void;
  osvjeziListu: () => void;
}

export default function DodajKandidataModal({ pozicijaId, zatvoriModal, osvjeziListu }: Props) {
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState('');
  
  const [formData, setFormData] = useState({
    ime_prezime: '',
    nacionalnost: '',
    email: '',
    telefon: '',
    datum_slanja: new Date().toISOString().split('T')[0],
  });

  const spremiKandidata = async () => {
    if (!formData.ime_prezime) {
      setGreska('Ime i prezime kandidata su obavezni.');
      return;
    }

    setSpremanje(true);
    const { error } = await supabase.from('kandidati').insert([{
      pozicija_id: pozicijaId,
      ime_prezime: formData.ime_prezime,
      nacionalnost: formData.nacionalnost,
      email: formData.email,
      telefon: formData.telefon,
      datum_slanja: formData.datum_slanja,
      status: 'Poslano klijentu'
    }]);

    if (error) {
      setGreska('Greška pri spremanju kandidata.');
      toast.error('Greška pri spremanju kandidata.');
      setSpremanje(false);
    } else {
      toast.success('Kandidat uspješno dodan');
      osvjeziListu();
      zatvoriModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Novi kandidat</h2>
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
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Ime i prezime</label>
            <input 
              type="text" 
              placeholder="Npr. Ivan Horvat"
              value={formData.ime_prezime} 
              onChange={(e) => setFormData({...formData, ime_prezime: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Nacionalnost</label>
              <input 
                type="text" 
                placeholder="Npr. Filipini"
                value={formData.nacionalnost} 
                onChange={(e) => setFormData({...formData, nacionalnost: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>
            <DatePickerInput
              label="Datum slanja"
              value={formData.datum_slanja}
              onChange={(val) => setFormData({ ...formData, datum_slanja: val })}
              align="right"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">E-mail</label>
              <input 
                type="email" 
                placeholder="ivan@email.com"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Telefon</label>
              <input 
                type="text" 
                placeholder="+385 91 123 4567"
                value={formData.telefon} 
                onChange={(e) => setFormData({...formData, telefon: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#07213E] flex justify-end gap-3 rounded-b-2xl">
          <button onClick={zatvoriModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-brand-navy dark:hover:text-white transition-colors">Odustani</button>
          <button 
            onClick={spremiKandidata}
            disabled={spremanje || !formData.ime_prezime}
            className="bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {spremanje && <Loader2 size={18} className="animate-spin" />}
            Spremi kandidata
          </button>
        </div>

      </div>
    </div>
  );
}