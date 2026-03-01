import KlijentDetaljiClientView from '@/components/klijenti/KlijentDetaljiClientView';
import { dohvatiKlijentaDetalje } from '@/lib/server/klijenti';

export const revalidate = 900;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function KlijentDetaljiPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const { klijent, pozicije, greska } = await dohvatiKlijentaDetalje(id);

  return (
    <KlijentDetaljiClientView
      id={id}
      initialKlijent={klijent}
      initialPozicije={pozicije}
      greska={greska}
      from={from}
    />
  );
}
