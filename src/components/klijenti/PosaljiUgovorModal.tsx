'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Paperclip, X } from 'lucide-react';

import type { UgovorDokument } from '@/lib/types/klijenti';

interface Props {
  otvoren: boolean;
  zatvoriModal: () => void;
  ugovori: UgovorDokument[];
  defaultTo?: string | null;
  klijentNaziv: string;
  odabraniUgovorId?: string | null;
  onPoslano: () => void;
}

interface IntegracijeResponse {
  mailTemplate?: {
    subjectTemplate?: string;
    bodyTemplate?: string;
  };
}

const renderTemplate = (
  template: string,
  params: { klijent_naziv: string; datum: string; naziv_ugovora: string }
): string => {
  return template.replace(/\{\{\s*(klijent_naziv|datum|naziv_ugovora)\s*\}\}/g, (_, key) => {
    return params[key as keyof typeof params] ?? '';
  });
};

const danasnjiDatum = (): string => new Date().toLocaleDateString('hr-HR');

export default function PosaljiUgovorModal({
  otvoren,
  zatvoriModal,
  ugovori,
  defaultTo,
  klijentNaziv,
  odabraniUgovorId,
  onPoslano,
}: Props) {
  const [to, setTo] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Ugovor o suradnji - {{klijent_naziv}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    'Poštovani,\n\nu privitku šaljemo ugovor {{naziv_ugovora}}.\n\nLijep pozdrav,'
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [trenutniUgovorId, setTrenutniUgovorId] = useState('');
  const [ucitavanjeTemplatea, setUcitavanjeTemplatea] = useState(false);
  const [slanje, setSlanje] = useState(false);
  const [greska, setGreska] = useState('');

  const odabraniUgovor = useMemo(
    () => ugovori.find((ugovor) => ugovor.id === trenutniUgovorId) || null,
    [trenutniUgovorId, ugovori]
  );

  useEffect(() => {
    if (!otvoren) return;
    setGreska('');
    setTo(defaultTo || '');
    setTrenutniUgovorId(odabraniUgovorId || ugovori[0]?.id || '');
  }, [otvoren, defaultTo, odabraniUgovorId, ugovori]);

  useEffect(() => {
    if (!otvoren) return;

    const ucitajTemplate = async () => {
      setUcitavanjeTemplatea(true);
      try {
        const response = await fetch('/api/postavke/integracije');
        if (!response.ok) return;
        const data = (await response.json()) as IntegracijeResponse;
        if (data.mailTemplate?.subjectTemplate) {
          setSubjectTemplate(data.mailTemplate.subjectTemplate);
        }
        if (data.mailTemplate?.bodyTemplate) {
          setBodyTemplate(data.mailTemplate.bodyTemplate);
        }
      } catch (error) {
        console.error('Ne mogu dohvatiti template maila:', error);
      } finally {
        setUcitavanjeTemplatea(false);
      }
    };

    void ucitajTemplate();
  }, [otvoren]);

  useEffect(() => {
    if (!otvoren || !odabraniUgovor) return;
    const context = {
      klijent_naziv: klijentNaziv,
      datum: danasnjiDatum(),
      naziv_ugovora: odabraniUgovor.naziv_datoteke,
    };
    setSubject(renderTemplate(subjectTemplate, context));
    setBody(renderTemplate(bodyTemplate, context));
  }, [otvoren, odabraniUgovor, subjectTemplate, bodyTemplate, klijentNaziv]);

  if (!otvoren) return null;

  const posaljiUgovor = async () => {
    if (!odabraniUgovor || !to.trim()) {
      setGreska('Odaberi ugovor i unesi email primatelja.');
      return;
    }

    setSlanje(true);
    setGreska('');
    try {
      const response = await fetch('/api/ugovori/posalji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ugovorId: odabraniUgovor.id,
          to: to.trim(),
          subject: subject.trim(),
          body,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Slanje ugovora nije uspjelo.');
      }

      onPoslano();
      zatvoriModal();
    } catch (error) {
      setGreska(error instanceof Error ? error.message : 'Greška pri slanju ugovora.');
    } finally {
      setSlanje(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Mail size={20} className="text-brand-yellow" />
            Pošalji ugovor
          </h2>
          <button onClick={zatvoriModal} className="text-gray-400 hover:text-brand-orange transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {greska && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
              {greska}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
              Ugovor (attachment)
            </label>
            <select
              value={trenutniUgovorId}
              onChange={(e) => setTrenutniUgovorId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            >
              {ugovori.map((ugovor) => (
                <option key={ugovor.id} value={ugovor.id}>
                  {ugovor.naziv_datoteke}
                </option>
              ))}
            </select>
            {odabraniUgovor && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Paperclip size={12} />
                {odabraniUgovor.naziv_datoteke}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="primatelj@tvrtka.hr"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">Sadržaj</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white resize-y"
            />
          </div>

          {ucitavanjeTemplatea && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Učitavam template maila iz postavki...</p>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#07213E] flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={zatvoriModal}
            className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-brand-navy dark:hover:text-white transition-colors"
          >
            Odustani
          </button>
          <button
            onClick={() => void posaljiUgovor()}
            disabled={slanje || !odabraniUgovor || !to.trim()}
            className="bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {slanje && <Loader2 size={18} className="animate-spin" />}
            Pošalji
          </button>
        </div>
      </div>
    </div>
  );
}
