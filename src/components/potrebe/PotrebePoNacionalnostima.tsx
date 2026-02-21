'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PotrebaPoNacionalnostiRow } from '@/components/potrebe/types';

interface Props {
  redovi: PotrebaPoNacionalnostiRow[];
  formatirajEure: (iznos: number) => string;
}

export default function PotrebePoNacionalnostima({ redovi, formatirajEure }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-brand-navy dark:text-white">Sve potrebe po nacionalnostima</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Prikaz svih otvorenih potreba sortiran po nacionalnosti.
        </p>
      </div>

      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                <th className="py-4 px-6">Nacionalnost</th>
                <th className="py-4 px-6">Tip radnika</th>
                <th className="py-4 px-6">Radno mjesto</th>
                <th className="py-4 px-6">Klijent</th>
                <th className="py-4 px-6 text-center">Radnici</th>
                <th className="py-4 px-6 text-right">Cijena</th>
                <th className="py-4 px-6 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {redovi.map((stavka) => (
                <tr
                  key={`${stavka.nacionalnost}-${stavka.kljuc}-${stavka.klijentNaziv}`}
                  className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6 font-semibold text-brand-navy dark:text-white">{stavka.nacionalnost}</td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">{stavka.tipRadnika}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-200">{stavka.naziv}</td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">{stavka.klijentNaziv}</td>
                  <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">{stavka.brojRadnika}</td>
                  <td className="py-4 px-6 text-right text-brand-navy dark:text-white font-semibold">
                    {formatirajEure(stavka.cijena)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/potrebe/${encodeURIComponent(stavka.kljuc)}?status=otvoreno`}
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
    </div>
  );
}
