'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { revalidateCachePaths } from '@/lib/client/revalidateCache';
import Select from '@/components/ui/Select';
import type { KlijentDetalji } from '@/lib/types/klijenti';

const INDUSTRIJA_OPCIJE = [
  { value: 'Proizvodnja', label: 'Proizvodnja' },
  { value: 'Građevina', label: 'Građevina' },
  { value: 'Ugostiteljstvo', label: 'Ugostiteljstvo' },
  { value: 'Prijevoz', label: 'Prijevoz' },
  { value: 'Logistika', label: 'Logistika' },
];

interface Props {
  klijent: KlijentDetalji;
  zatvoriModal: () => void;
  onSpremljeno: () => void;
}

export default function UrediKlijentaModal({ klijent, zatvoriModal, onSpremljeno }: Props) {
  const [formData, setFormData] = useState({
    naziv_tvrtke: klijent.naziv_tvrtke,
    skraceni_naziv: klijent.skraceni_naziv ?? '',
    oib: klijent.oib,
    mbs: klijent.mbs ?? '',
    ulica: klijent.ulica ?? '',
    grad: klijent.grad ?? '',
    industrija: klijent.industrija ?? 'Proizvodnja',
  });
  const [greska, setGreska] = useState('');
  const [spremanje, setSpremanje] = useState(false);

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const spremi = async () => {
    if (!formData.naziv_tvrtke.trim()) {
      setGreska('Naziv tvrtke je obavezan.');
      return;
    }
    if (!formData.oib.trim() || formData.oib.trim().length !== 11) {
      setGreska('OIB mora imati točno 11 znakova.');
      return;
    }
    setGreska('');
    setSpremanje(true);

    const { error } = await supabase
      .from('klijenti')
      .update({
        naziv_tvrtke: formData.naziv_tvrtke.trim(),
        skraceni_naziv: formData.skraceni_naziv.trim() || null,
        oib: formData.oib.trim(),
        mbs: formData.mbs.trim() || null,
        ulica: formData.ulica.trim() || null,
        grad: formData.grad.trim() || null,
        industrija: formData.industrija || null,
      })
      .eq('id', klijent.id);

    if (error) {
      setGreska('Greška pri spremanju. Pokušajte ponovo.');
      toast.error('Greška pri uređivanju klijenta.');
      setSpremanje(false);
      return;
    }

    await revalidateCachePaths(['/klijenti', `/klijenti/${klijent.id}`]);
    toast.success('Klijent uspješno ažuriran.');
    onSpremljeno();
    zatvoriModal();
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">

        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Uredi klijenta</h2>
          <button
            onClick={zatvoriModal}
            className="text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {greska && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
              {greska}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
              Naziv tvrtke *
            </label>
            <input
              type="text"
              value={formData.naziv_tvrtke}
              onChange={set('naziv_tvrtke')}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
              Skraćeni naziv
            </label>
            <input
              type="text"
              value={formData.skraceni_naziv}
              onChange={set('skraceni_naziv')}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">OIB *</label>
              <input
                type="text"
                value={formData.oib}
                onChange={set('oib')}
                maxLength={11}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">MBS</label>
              <input
                type="text"
                value={formData.mbs}
                onChange={set('mbs')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
              Ulica i kućni broj
            </label>
            <input
              type="text"
              value={formData.ulica}
              onChange={set('ulica')}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Grad</label>
            <input
              type="text"
              value={formData.grad}
              onChange={set('grad')}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <Select
            label="Industrija"
            value={formData.industrija}
            onChange={(v) => setFormData((prev) => ({ ...prev, industrija: v }))}
            options={INDUSTRIJA_OPCIJE}
          />
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={zatvoriModal}
            className="text-gray-600 dark:text-gray-400 hover:text-brand-navy dark:hover:text-white transition-colors font-medium px-4 py-2.5"
          >
            Odustani
          </button>
          <button
            type="button"
            onClick={() => void spremi()}
            disabled={spremanje}
            className="bg-brand-orange hover:bg-brand-yellow text-white px-6 py-2.5 rounded-xl transition-colors font-medium disabled:opacity-60"
          >
            {spremanje ? 'Spremam...' : 'Spremi'}
          </button>
        </div>
      </div>
    </div>
  );
}
