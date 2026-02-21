import KlijentDetaljiClientView from '@/components/klijenti/KlijentDetaljiClientView';
import { dohvatiKlijentaDetalje } from '@/lib/server/klijenti';

export const revalidate = 900;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KlijentDetaljiPage({ params }: PageProps) {
  const { id } = await params;
  const { klijent, pozicije, greska } = await dohvatiKlijentaDetalje(id);

  return (
    <KlijentDetaljiClientView
      id={id}
      initialKlijent={klijent}
      initialPozicije={pozicije}
      greska={greska}
    />
  );
}
