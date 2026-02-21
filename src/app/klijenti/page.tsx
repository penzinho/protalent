import KlijentiClientView from '@/components/klijenti/KlijentiClientView';
import { dohvatiKlijenteOverview } from '@/lib/server/klijenti';

export const dynamic = 'force-dynamic';

export default async function KlijentiPage() {
  const { klijenti, greska } = await dohvatiKlijenteOverview();

  return <KlijentiClientView initialKlijenti={klijenti} greska={greska} />;
}
