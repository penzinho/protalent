'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { GrupiranaPotrebaRow } from '@/components/potrebe/types';

interface Props {
  redovi: GrupiranaPotrebaRow[];
  statusParametar: 'otvoreno' | 'zatvoreno';
  formatirajEure: (iznos: number) => string;
}

const tekstVrijednosti = (vrijednosti: string[]) => {
  if (!vrijednosti.length) return '-';
  return vrijednosti.join(', ');
};

export default function PotrebePregledTablica({
  redovi,
  statusParametar,
  formatirajEure,
}: Props) {
  return (
    <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
              <th className="py-4 px-6">Radno mjesto</th>
              <th className="py-4 px-6">Tip traženog radnika</th>
              <th className="py-4 px-6">Nacionalnost</th>
              <th className="py-4 px-6 text-center">Potrebe</th>
              <th className="py-4 px-6 text-center">Klijenti</th>
              <th className="py-4 px-6 text-center">Radnici</th>
              <th className="py-4 px-6 text-right">Prosj. cijena</th>
              <th className="py-4 px-6 text-right">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {redovi.map((potreba) => (
              <tr key={potreba.kljuc} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                <td className="py-4 px-6">
                  <p className="font-bold text-brand-navy dark:text-white">{potreba.naziv}</p>
                </td>
                <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">
                  {tekstVrijednosti(potreba.tipoviRadnika)}
                </td>
                <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">
                  {tekstVrijednosti(potreba.nacionalnosti)}
                </td>
                <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 font-semibold">
                  {potreba.brojPotreba}
                </td>
                <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">
                  {potreba.brojKlijenata}
                </td>
                <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">
                  {potreba.ukupnoRadnika}
                </td>
                <td className="py-4 px-6 text-right text-brand-navy dark:text-white font-semibold">
                  {formatirajEure(potreba.prosjecnaCijena)}
                </td>
                <td className="py-4 px-6 text-right">
                  <Link
                    href={`/potrebe/${encodeURIComponent(potreba.kljuc)}?status=${statusParametar}`}
                    className="inline-flex items-center gap-1 text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                  >
                    Detalji <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
