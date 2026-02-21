'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

const KORISNIK_POSTAVKE_STORAGE_KEY = 'hr-korisnik-postavke';

type KorisnikPostavke = {
  imePrezime: string;
  email: string;
};

export default function PostavkePage() {
  const [postavke, setPostavke] = useState<KorisnikPostavke>({
    imePrezime: '',
    email: '',
  });
  const [spremljeno, setSpremljeno] = useState(false);

  useEffect(() => {
    const spremljenoLokalno = localStorage.getItem(KORISNIK_POSTAVKE_STORAGE_KEY);

    if (!spremljenoLokalno) return;

    try {
      const parsirano = JSON.parse(spremljenoLokalno) as KorisnikPostavke;
      setPostavke({
        imePrezime: parsirano.imePrezime || '',
        email: parsirano.email || '',
      });
    } catch {
      localStorage.removeItem(KORISNIK_POSTAVKE_STORAGE_KEY);
    }
  }, []);

  const spremiPostavke = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    localStorage.setItem(KORISNIK_POSTAVKE_STORAGE_KEY, JSON.stringify(postavke));
    setSpremljeno(true);

    setTimeout(() => {
      setSpremljeno(false);
    }, 2200);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Postavke</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Osnovni podaci korisnika aplikacije.
        </p>
      </div>

      <form
        onSubmit={spremiPostavke}
        className="bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="imePrezime" className="text-sm font-semibold text-brand-navy dark:text-gray-300 block">
            Ime i prezime
          </label>
          <input
            id="imePrezime"
            type="text"
            value={postavke.imePrezime}
            onChange={(event) => setPostavke((prev) => ({ ...prev, imePrezime: event.target.value }))}
            placeholder="Unesite ime i prezime"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-transparent dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-brand-navy dark:text-gray-300 block">
            Email adresa
          </label>
          <input
            id="email"
            type="email"
            value={postavke.email}
            onChange={(event) => setPostavke((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="ime.prezime@tvrtka.com"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-transparent dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-brand-navy hover:bg-[#07213E] dark:bg-brand-yellow dark:hover:bg-yellow-500 text-white dark:text-brand-navy px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Save size={18} />
            Spremi
          </button>

          {spremljeno && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Postavke su spremljene.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
