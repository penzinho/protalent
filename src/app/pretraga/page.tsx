import { createSupabaseServerClient } from '@/lib/server/supabase';
import { Building2, Briefcase, Search } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import PretragaInput from './PretragaInput';

interface KlijentRow {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  oib: string;
  industrija: string | null;
  grad: string | null;
}

interface PozicijaRaw {
  id: unknown;
  naziv_pozicije: unknown;
  status: unknown;
  klijenti: { naziv_tvrtke: unknown; skraceni_naziv: unknown } | null;
}

interface PozicijaRow {
  id: string;
  naziv_pozicije: string;
  status: string | null;
  klijent_naziv: string;
}

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function PretragaPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const upit = q?.trim() ?? '';

  let klijenti: KlijentRow[] = [];
  let pozicije: PozicijaRow[] = [];

  if (upit.length >= 2) {
    const supabase = await createSupabaseServerClient();

    const [klijentiRes, pozicijeRes] = await Promise.all([
      supabase
        .from('klijenti')
        .select('id, naziv_tvrtke, skraceni_naziv, oib, industrija, grad')
        .or(`naziv_tvrtke.ilike.%${upit}%,skraceni_naziv.ilike.%${upit}%,oib.ilike.%${upit}%`)
        .order('naziv_tvrtke')
        .limit(50),
      supabase
        .from('pozicije')
        .select('id, naziv_pozicije, status, klijenti(naziv_tvrtke, skraceni_naziv)')
        .ilike('naziv_pozicije', `%${upit}%`)
        .order('naziv_pozicije')
        .limit(50),
    ]);

    klijenti = (klijentiRes.data as KlijentRow[] | null) ?? [];
    pozicije = ((pozicijeRes.data as unknown as PozicijaRaw[] | null) ?? []).map((raw) => ({
      id: String(raw.id ?? ''),
      naziv_pozicije: String(raw.naziv_pozicije ?? ''),
      status: raw.status ? String(raw.status) : null,
      klijent_naziv: raw.klijenti
        ? String(raw.klijenti.skraceni_naziv ?? raw.klijenti.naziv_tvrtke ?? '')
        : '',
    }));
  }

  const ukupno = klijenti.length + pozicije.length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-white flex items-center gap-3">
            <Search className="text-brand-yellow" size={28} />
            Pretraga
          </h1>
          {upit ? (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {ukupno === 0
                ? `Nema rezultata za „${upit}"`
                : `${ukupno} ${ukupno === 1 ? 'rezultat' : ukupno < 5 ? 'rezultata' : 'rezultata'} za „${upit}"`}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Unesite pojam za pretraživanje
            </p>
          )}
        </div>
        <PretragaInput defaultValue={upit} />
      </div>

      {!upit || upit.length < 2 ? (
        <EmptyState
          icon={Search}
          title="Unesite pojam za pretraživanje"
          description="Pretraži klijente i pozicije po imenu, OIB-u ili nazivu radnog mjesta."
        />
      ) : ukupno === 0 ? (
        <EmptyState
          icon={Search}
          title={`Nema rezultata za „${upit}"`}
          description="Pokušajte s drugačijim pojmom ili provjerite pravopis."
        />
      ) : (
        <div className="space-y-8">
          {/* Klijenti */}
          {klijenti.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2 mb-4">
                <Building2 className="text-brand-yellow" size={20} />
                Klijenti
                <span className="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({klijenti.length})
                </span>
              </h2>
              <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                        <th className="py-3 px-6">Naziv</th>
                        <th className="py-3 px-6">OIB</th>
                        <th className="py-3 px-6">Industrija</th>
                        <th className="py-3 px-6">Grad</th>
                        <th className="py-3 px-6 text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {klijenti.map((k) => (
                        <tr
                          key={k.id}
                          className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-6">
                            <Link href={`/klijenti/${k.id}?from=pretraga`} className="font-semibold text-brand-navy dark:text-white hover:text-brand-yellow transition-colors">
                              {k.skraceni_naziv || k.naziv_tvrtke}
                            </Link>
                            {k.skraceni_naziv && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {k.naziv_tvrtke}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-6 text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {k.oib}
                          </td>
                          <td className="py-3 px-6">
                            {k.industrija && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-navy/5 dark:bg-brand-yellow/10 text-brand-navy dark:text-brand-yellow border border-brand-navy/10 dark:border-brand-yellow/20">
                                {k.industrija}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-300">
                            {k.grad || '-'}
                          </td>
                          <td className="py-3 px-6 text-right">
                            <Link
                              href={`/klijenti/${k.id}?from=pretraga`}
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
            </div>
          )}

          {/* Pozicije */}
          {pozicije.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2 mb-4">
                <Briefcase className="text-brand-yellow" size={20} />
                Pozicije / Potrebe
                <span className="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({pozicije.length})
                </span>
              </h2>
              <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                        <th className="py-3 px-6">Radno mjesto</th>
                        <th className="py-3 px-6">Klijent</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6 text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {pozicije.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-6">
                            <Link href={`/pozicije/${p.id}?from=pretraga`} className="font-semibold text-brand-navy dark:text-white hover:text-brand-yellow transition-colors">
                              {p.naziv_pozicije}
                            </Link>
                          </td>
                          <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-300">
                            {p.klijent_naziv || '-'}
                          </td>
                          <td className="py-3 px-6">
                            {p.status && (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  p.status.toLowerCase() === 'zatvoreno'
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40'
                                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40'
                                }`}
                              >
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-right">
                            <Link
                              href={`/pozicije/${p.id}?from=pretraga`}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
