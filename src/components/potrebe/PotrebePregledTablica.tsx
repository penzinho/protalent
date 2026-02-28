'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/ui/data-table';
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
        <DataTable className="w-full text-left border-collapse">
          <DataTableHeader>
            <DataTableRow className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
              <DataTableHead className="py-4 px-6">Radno mjesto</DataTableHead>
              <DataTableHead className="py-4 px-6">Tip traženog radnika</DataTableHead>
              <DataTableHead className="py-4 px-6">Nacionalnost</DataTableHead>
              <DataTableHead className="py-4 px-6 text-center">Potrebe</DataTableHead>
              <DataTableHead className="py-4 px-6 text-center">Klijenti</DataTableHead>
              <DataTableHead className="py-4 px-6 text-center">Radnici</DataTableHead>
              <DataTableHead className="py-4 px-6 text-right">Prosj. cijena</DataTableHead>
              <DataTableHead className="py-4 px-6 text-right">Akcije</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {redovi.map((potreba) => (
              <DataTableRow key={potreba.kljuc} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                <DataTableCell className="py-4 px-6">
                  <p className="font-bold text-brand-navy dark:text-white">{potreba.naziv}</p>
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">
                  {tekstVrijednosti(potreba.tipoviRadnika)}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-gray-600 dark:text-gray-300 text-sm">
                  {tekstVrijednosti(potreba.nacionalnosti)}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 font-semibold">
                  {potreba.brojPotreba}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">
                  {potreba.brojKlijenata}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-center text-gray-600 dark:text-gray-300">
                  {potreba.ukupnoRadnika}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-right text-brand-navy dark:text-white font-semibold">
                  {formatirajEure(potreba.prosjecnaCijena)}
                </DataTableCell>
                <DataTableCell className="py-4 px-6 text-right">
                  <Link
                    href={`/potrebe/${encodeURIComponent(potreba.kljuc)}?status=${statusParametar}`}
                    className="inline-flex items-center gap-1 text-brand-yellow hover:text-brand-orange font-medium text-sm transition-colors"
                  >
                    Detalji <ArrowRight size={14} />
                  </Link>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
