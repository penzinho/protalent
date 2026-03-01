'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Building2, Briefcase, X, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface KlijentResult {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  oib: string;
  industrija: string | null;
}

interface PozicijaRaw {
  id: unknown;
  naziv_pozicije: unknown;
  status: unknown;
  klijenti: { naziv_tvrtke: unknown; skraceni_naziv: unknown } | null;
}

interface PozicijaResult {
  id: string;
  naziv_pozicije: string;
  status: string | null;
  klijent_naziv: string;
}

interface SearchResults {
  klijenti: KlijentResult[];
  pozicije: PozicijaResult[];
}

type PopoverPos = { top: number; left: number; width: number };

function mapPozicijaRaw(raw: PozicijaRaw): PozicijaResult {
  const k = raw.klijenti;
  return {
    id: String(raw.id ?? ''),
    naziv_pozicije: String(raw.naziv_pozicije ?? ''),
    status: raw.status ? String(raw.status) : null,
    klijent_naziv: k ? String(k.skraceni_naziv ?? k.naziv_tvrtke ?? '') : '',
  };
}

export default function GlobalSearch() {
  const router = useRouter();
  const [upit, setUpit] = useState('');
  const [rezultati, setRezultati] = useState<SearchResults>({ klijenti: [], pozicije: [] });
  const [ucitavanje, setUcitavanje] = useState(false);
  const [otvoren, setOtvoren] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const izracunajPoziciju = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 380) });
  }, []);

  const pretrazi = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setRezultati({ klijenti: [], pozicije: [] });
        setOtvoren(false);
        setUcitavanje(false);
        return;
      }

      const [klijentiRes, pozicijeRes] = await Promise.all([
        supabase
          .from('klijenti')
          .select('id, naziv_tvrtke, skraceni_naziv, oib, industrija')
          .or(`naziv_tvrtke.ilike.%${q}%,skraceni_naziv.ilike.%${q}%,oib.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('pozicije')
          .select('id, naziv_pozicije, status, klijenti(naziv_tvrtke, skraceni_naziv)')
          .ilike('naziv_pozicije', `%${q}%`)
          .limit(5),
      ]);

      setRezultati({
        klijenti: (klijentiRes.data as KlijentResult[] | null) ?? [],
        pozicije: ((pozicijeRes.data as unknown as PozicijaRaw[] | null) ?? []).map(mapPozicijaRaw),
      });
      setUcitavanje(false);
      setOtvoren(true);
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUpit(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setOtvoren(false);
      setRezultati({ klijenti: [], pozicije: [] });
      setUcitavanje(false);
      return;
    }
    setUcitavanje(true);
    izracunajPoziciju();
    debounceRef.current = setTimeout(() => void pretrazi(val), 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && upit.trim()) {
      setOtvoren(false);
      router.push(`/pretraga?q=${encodeURIComponent(upit.trim())}`);
    }
    if (e.key === 'Escape') setOtvoren(false);
  };

  const ocisti = () => {
    setUpit('');
    setRezultati({ klijenti: [], pozicije: [] });
    setOtvoren(false);
    inputRef.current?.focus();
  };

  const navigirajPretragu = () => {
    setOtvoren(false);
    router.push(`/pretraga?q=${encodeURIComponent(upit.trim())}`);
  };

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOtvoren(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const imaRezultata = rezultati.klijenti.length > 0 || rezultati.pozicije.length > 0;

  const popover =
    otvoren && popoverPos ? (
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: popoverPos.top,
          left: popoverPos.left,
          width: popoverPos.width,
          zIndex: 9999,
        }}
        className="bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {ucitavanje ? (
          <div className="flex items-center justify-center gap-2 py-5 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Pretražujem...
          </div>
        ) : !imaRezultata ? (
          <div className="py-5 text-sm text-gray-500 dark:text-gray-400 text-center">
            Nema rezultata za &bdquo;{upit}&ldquo;
          </div>
        ) : (
          <>
            {rezultati.klijenti.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={11} /> Klijenti
                </div>
                {rezultati.klijenti.map((k) => (
                  <Link
                    key={k.id}
                    href={`/klijenti/${k.id}?from=pretraga`}
                    onClick={() => {
                      setOtvoren(false);
                      setUpit('');
                    }}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy dark:text-white">
                        {k.skraceni_naziv || k.naziv_tvrtke}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">OIB: {k.oib}</p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-brand-yellow transition-colors shrink-0"
                    />
                  </Link>
                ))}
              </div>
            )}

            {rezultati.pozicije.length > 0 && (
              <div
                className={
                  rezultati.klijenti.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }
              >
                <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={11} /> Pozicije / Potrebe
                </div>
                {rezultati.pozicije.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pozicije/${p.id}?from=pretraga`}
                    onClick={() => {
                      setOtvoren(false);
                      setUpit('');
                    }}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy dark:text-white">
                        {p.naziv_pozicije}
                      </p>
                      {p.klijent_naziv && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.klijent_naziv}</p>
                      )}
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-brand-yellow transition-colors shrink-0"
                    />
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
              <button
                onClick={navigirajPretragu}
                className="text-xs text-brand-yellow hover:text-brand-orange transition-colors font-medium w-full text-left flex items-center gap-1.5"
              >
                <Search size={11} /> Prikaži sve rezultate za &bdquo;{upit}&ldquo;
              </button>
            </div>
          </>
        )}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          size={16}
        />
        <input
          ref={inputRef}
          type="text"
          value={upit}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (upit.trim().length >= 2 && imaRezultata) {
              izracunajPoziciju();
              setOtvoren(true);
            }
          }}
          placeholder="Pretraži klijente, pozicije..."
          className="w-full pl-10 pr-8 py-2 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-yellow transition-all"
        />
        {upit && (
          <button
            type="button"
            onClick={ocisti}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-navy dark:hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {typeof window !== 'undefined' && createPortal(popover, document.body)}
    </div>
  );
}
