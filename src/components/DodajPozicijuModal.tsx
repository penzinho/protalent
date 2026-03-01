'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Calculator } from 'lucide-react';
import { revalidateCachePaths } from '@/lib/client/revalidateCache';
import DatePickerInput from '@/components/ui/DatePickerInput';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';

interface Props {
  klijentId: string;
  zatvoriModal: () => void;
  osvjeziListu: () => void;
}

interface NacionalnostOpcija {
  id: string;
  naziv: string;
}

export default function DodajPozicijuModal({ klijentId, zatvoriModal, osvjeziListu }: Props) {
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState('');
  const TIPOVI_RADNIKA = ['domaci', 'strani', 'strani_u_rh'] as const;
  const [nacionalnostiOpcije, setNacionalnostiOpcije] = useState<NacionalnostOpcija[]>([]);
  const [odabraneNacionalnosti, setOdabraneNacionalnosti] = useState<string[]>([]);
  const [novaNacionalnost, setNovaNacionalnost] = useState('');
  const [dodavanjeNacionalnosti, setDodavanjeNacionalnosti] = useState(false);
  
  const [formData, setFormData] = useState({
    naziv_pozicije: '',
    broj_izvrsitelja: '1', // Promijenjeno u string kako bismo mogli obrisati broj
    datum_upisa: new Date().toISOString().split('T')[0],
    tip_radnika: 'domaci' as (typeof TIPOVI_RADNIKA)[number],
    cijena_po_kandidatu: '',
    avans_dogovoren: false,
    avans_postotak: '',
  });

  const trebaNacionalnosti =
    formData.tip_radnika === 'strani' || formData.tip_radnika === 'strani_u_rh';

  const dohvatiNacionalnosti = async () => {
    const { data, error } = await supabase
      .from('nacionalnosti_radnika')
      .select('id, naziv')
      .order('naziv', { ascending: true });

    if (error) {
      console.error('Greška pri dohvaćanju nacionalnosti:', error);
      return;
    }

    setNacionalnostiOpcije((data || []) as NacionalnostOpcija[]);
  };

  useEffect(() => {
    supabase
      .from('nacionalnosti_radnika')
      .select('id, naziv')
      .order('naziv', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setNacionalnostiOpcije((data || []) as NacionalnostOpcija[]);
        else console.error('Greška pri dohvaćanju nacionalnosti:', error);
      });
  }, []);

  // Funkcija za automatski izračun avansa u eurima
  const izracunajIznosAvansa = () => {
    const cijena = parseFloat(formData.cijena_po_kandidatu);
    const postotak = parseFloat(formData.avans_postotak);
    if (!isNaN(cijena) && !isNaN(postotak)) {
      return ((cijena * postotak) / 100).toFixed(2);
    }
    return '0.00';
  };

  const toggleNacionalnost = (nacionalnostId: string) => {
    setOdabraneNacionalnosti((trenutne) =>
      trenutne.includes(nacionalnostId)
        ? trenutne.filter((id) => id !== nacionalnostId)
        : [...trenutne, nacionalnostId]
    );
  };

  const dodajNovuNacionalnost = async () => {
    const naziv = novaNacionalnost.trim();
    if (!naziv) return;

    setDodavanjeNacionalnosti(true);
    setGreska('');

    const { data, error } = await supabase
      .from('nacionalnosti_radnika')
      .insert([{ naziv }])
      .select('id, naziv')
      .single();

    if (error) {
      if ((error as { code?: string | null }).code === '23505') {
        setGreska('Nacionalnost već postoji u popisu.');
        setNovaNacionalnost('');
        await dohvatiNacionalnosti();
      } else {
        setGreska('Greška pri dodavanju nacionalnosti.');
      }
      setDodavanjeNacionalnosti(false);
      return;
    }

    const nova = data as NacionalnostOpcija;
    setNacionalnostiOpcije((trenutne) =>
      [...trenutne, nova].sort((a, b) => a.naziv.localeCompare(b.naziv, 'hr'))
    );
    setOdabraneNacionalnosti((trenutne) =>
      trenutne.includes(nova.id) ? trenutne : [...trenutne, nova.id]
    );
    setNovaNacionalnost('');
    setDodavanjeNacionalnosti(false);
  };

  const spremiPoziciju = async () => {
    if (
      !formData.naziv_pozicije ||
      !formData.cijena_po_kandidatu ||
      !TIPOVI_RADNIKA.includes(formData.tip_radnika)
    ) {
      setGreska('Molimo ispunite naziv pozicije, tip radnika i cijenu.');
      return;
    }

    if (trebaNacionalnosti && odabraneNacionalnosti.length === 0) {
      setGreska('Za strani tip radnika odaberite barem jednu nacionalnost.');
      return;
    }

    setSpremanje(true);
    setGreska('');

    const { data: novaPozicija, error } = await supabase
      .from('pozicije')
      .insert([{
        klijent_id: klijentId,
        naziv_pozicije: formData.naziv_pozicije,
        broj_izvrsitelja: parseInt(formData.broj_izvrsitelja) || 1, // Osiguravamo da je barem 1 ako se ostavi prazno na kraju
        datum_upisa: formData.datum_upisa,
        tip_radnika: formData.tip_radnika,
        cijena_po_kandidatu: parseFloat(formData.cijena_po_kandidatu),
        avans_dogovoren: formData.avans_dogovoren,
        avans_postotak: formData.avans_dogovoren ? parseFloat(formData.avans_postotak) : null,
        status: 'Otvoreno'
      }])
      .select('id')
      .single();

    if (error || !novaPozicija?.id) {
      setGreska('Greška pri spremanju pozicije.');
      toast.error('Greška pri spremanju pozicije.');
      setSpremanje(false);
      return;
    }

    if (trebaNacionalnosti) {
      const payload = odabraneNacionalnosti.map((nacionalnostId) => ({
        pozicija_id: novaPozicija.id as string,
        nacionalnost_id: nacionalnostId,
      }));
      const { error: povezivanjeGreska } = await supabase
        .from('pozicije_nacionalnosti')
        .insert(payload);

      if (povezivanjeGreska) {
        setGreska('Pozicija je spremljena, ali nacionalnosti nisu uspješno povezane.');
        toast.error('Nacionalnosti nisu uspješno povezane.');
        setSpremanje(false);
        return;
      }
    }

    const revalidated = await revalidateCachePaths(['/klijenti', `/klijenti/${klijentId}`]);
    if (!revalidated) {
      console.error(`Pozicija spremljena, ali revalidate cachea nije uspio za klijenta ${klijentId}.`);
    }
    toast.success('Potreba uspješno dodana');
    osvjeziListu();
    zatvoriModal();
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
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
            <DatePickerInput
              label="Datum upisa"
              value={formData.datum_upisa}
              onChange={(val) => setFormData({ ...formData, datum_upisa: val })}
              align="right"
            />
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

          <Select
            label="Tip radnika"
            value={formData.tip_radnika}
            onChange={(v) => {
              const noviTip = v as (typeof TIPOVI_RADNIKA)[number];
              setFormData({ ...formData, tip_radnika: noviTip });
              if (noviTip === 'domaci') setOdabraneNacionalnosti([]);
            }}
            options={[
              { value: 'domaci', label: 'Domaći' },
              { value: 'strani', label: 'Strani' },
              { value: 'strani_u_rh', label: 'Strani radnici u RH' },
            ]}
          />

          {trebaNacionalnosti && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#05182d] rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
                  Nacionalnosti radnika
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Odaberite jednu ili više nacionalnosti za ovu potrebu.
                </p>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {nacionalnostiOpcije.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Trenutno nema nacionalnosti u bazi.
                  </p>
                ) : (
                  nacionalnostiOpcije.map((nacionalnost) => (
                    <label key={nacionalnost.id} className="flex items-center gap-2 text-sm text-brand-navy dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={odabraneNacionalnosti.includes(nacionalnost.id)}
                        onChange={() => toggleNacionalnost(nacionalnost.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange accent-brand-orange"
                      />
                      {nacionalnost.naziv}
                    </label>
                  ))
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Dodaj novu nacionalnost"
                  value={novaNacionalnost}
                  onChange={(e) => setNovaNacionalnost(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
                />
                <button
                  type="button"
                  onClick={dodajNovuNacionalnost}
                  disabled={dodavanjeNacionalnosti || !novaNacionalnost.trim()}
                  className="px-4 py-2.5 bg-brand-navy dark:bg-brand-yellow text-white dark:text-brand-navy rounded-xl font-medium disabled:opacity-50"
                >
                  {dodavanjeNacionalnosti ? 'Dodajem...' : 'Dodaj'}
                </button>
              </div>
            </div>
          )}

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
            disabled={
              spremanje ||
              !formData.naziv_pozicije ||
              !formData.tip_radnika ||
              !formData.cijena_po_kandidatu ||
              (trebaNacionalnosti && odabraneNacionalnosti.length === 0)
            }
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
