'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Calendar,
  Euro,
  Percent,
  Plus,
  Save,
  FileText,
  Globe,
  Phone,
  Mail,
  ChevronDown,
  Pencil,
  Upload,
  Download,
  Send,
} from 'lucide-react';
import DodajKandidataModal from '@/components/DodajKandidataModal';
import EmptyState from '@/components/ui/EmptyState';
import UrediPozicijuModal from '@/components/UrediPozicijuModal';
import PosaljiUgovorModal from '@/components/klijenti/PosaljiUgovorModal';
import { generirajUgovorPdfDatoteka } from '@/lib/pdf/generirajUgovorPdf';
import type { UgovorDokument } from '@/lib/types/klijenti';
import type { KandidatCvSummary, PotrebaDokument, PotrebaDokumentTip } from '@/lib/types/dokumenti';

type AktivniDatotekeTab = 'ugovor' | 'zivotopisi' | 'ostalo';

interface KandidatRow {
  id: string;
  ime_prezime: string;
  nacionalnost: string | null;
  email: string | null;
  telefon: string | null;
  status: string;
  datum_slanja: string;
}

interface PotrebaDatotekeResponse {
  zivotopisi?: PotrebaDokument[];
  ostalo?: PotrebaDokument[];
  kandidatiCvSummary?: KandidatCvSummary[];
  error?: string;
}

interface UgovoriResponse {
  ugovori?: UgovorDokument[];
  error?: string;
}

const formatirajDatum = (datumString: string) => {
  if (!datumString) return '-';
  const d = new Date(datumString);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`;
};

const formatirajTipRadnika = (tipRadnika?: string | null) => {
  switch (tipRadnika) {
    case 'strani':
      return 'Strani';
    case 'strani_u_rh':
      return 'Strani radnici u RH';
    case 'domaci':
    default:
      return 'Domaći';
  }
};

const formatirajNacionalnosti = (nacionalnosti?: string[] | null) => {
  if (!Array.isArray(nacionalnosti) || nacionalnosti.length === 0) return '-';
  return nacionalnosti.join(', ');
};

const jeNedostupnaRelacijaNacionalnosti = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as { code?: string | null; message?: string | null; details?: string | null };
  const code = String(payload.code || '');
  const text = `${payload.message || ''} ${payload.details || ''}`.toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST200' ||
    text.includes('pozicije_nacionalnosti') ||
    text.includes('nacionalnosti_radnika')
  );
};

const izvuciNacionalnosti = (pozicijaData: any): string[] => {
  if (!Array.isArray(pozicijaData?.pozicije_nacionalnosti)) return [];
  const mapped = pozicijaData.pozicije_nacionalnosti
    .map((stavka: any) => stavka?.nacionalnosti_radnika?.naziv)
    .filter((naziv: unknown) => typeof naziv === 'string') as string[];
  return Array.from(new Set(mapped));
};

const izvuciNacionalnostiIdove = (pozicijaData: any): string[] => {
  if (!Array.isArray(pozicijaData?.pozicije_nacionalnosti)) return [];
  const mapped = pozicijaData.pozicije_nacionalnosti
    .map((stavka: any) => stavka?.nacionalnost_id)
    .filter((id: unknown) => typeof id === 'string') as string[];
  return Array.from(new Set(mapped));
};

const normalizirajStatusPotrebe = (status?: string | null) => {
  if ((status || '').toLowerCase() === 'zatvoreno') return 'Zatvoreno';
  return 'Otvoreno';
};

const dobijBojuStatusaPotrebe = (status: string) => {
  if (status === 'Zatvoreno') {
    return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40';
  }
  return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40';
};

const dobijBojuStatusa = (status: string) => {
  switch (status) {
    case 'Poslano klijentu':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
    case 'Dogovoren razgovor':
      return 'bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange dark:text-brand-yellow border-brand-orange/20 dark:border-brand-orange/30';
    case 'Odbijen':
      return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
    case 'Zaposlen':
      return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50';
    default:
      return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
};

const pregledLinkZaDatoteku = (doc: {
  drive_web_view_link: string | null;
  drive_file_id: string;
}): string =>
  doc.drive_web_view_link ||
  `https://drive.google.com/file/d/${encodeURIComponent(doc.drive_file_id)}/view`;

const preuzmiLinkZaDatoteku = (doc: {
  drive_download_link: string | null;
  drive_file_id: string;
}): string =>
  doc.drive_download_link ||
  `https://drive.google.com/uc?export=download&id=${encodeURIComponent(doc.drive_file_id)}`;

export default function PozicijaDetaljiPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const potrebaId = String(id || '');

  const [pozicija, setPozicija] = useState<any>(null);
  const [kandidati, setKandidati] = useState<KandidatRow[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [modalOtvoren, setModalOtvoren] = useState(false);
  const [modalUrediOtvoren, setModalUrediOtvoren] = useState(false);
  const [modalPosaljiOtvoren, setModalPosaljiOtvoren] = useState(false);
  const [odabraniUgovorZaSlanje, setOdabraniUgovorZaSlanje] = useState<string | null>(null);

  const [mijenjanjeStatusaPotrebe, setMijenjanjeStatusaPotrebe] = useState(false);
  const [uvjeti, setUvjeti] = useState('');
  const [spremanjeUvjeta, setSpremanjeUvjeta] = useState(false);

  const [aktivniDatotekeTab, setAktivniDatotekeTab] = useState<AktivniDatotekeTab>('ugovor');
  const [ucitavanjeDatoteka, setUcitavanjeDatoteka] = useState(false);
  const [ugovoriPotrebe, setUgovoriPotrebe] = useState<UgovorDokument[]>([]);
  const [zivotopisi, setZivotopisi] = useState<PotrebaDokument[]>([]);
  const [ostaloDokumenti, setOstaloDokumenti] = useState<PotrebaDokument[]>([]);
  const [kandidatiCvSummary, setKandidatiCvSummary] = useState<KandidatCvSummary[]>([]);

  const [odabraniKandidatZaCv, setOdabraniKandidatZaCv] = useState('');
  const [odabraniCvFile, setOdabraniCvFile] = useState<File | null>(null);
  const [odabraniOstaloFile, setOdabraniOstaloFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingOstalo, setUploadingOstalo] = useState(false);
  const [uploadingCvKandidatId, setUploadingCvKandidatId] = useState<string | null>(null);

  const kandidatiCvSummaryById = useMemo(
    () => new Map(kandidatiCvSummary.map((summary) => [summary.kandidatId, summary])),
    [kandidatiCvSummary]
  );

  const dohvatiDatotekePotrebe = async (klijentId: string) => {
    if (!potrebaId || !klijentId) return;

    setUcitavanjeDatoteka(true);
    try {
      const [ugovoriRes, datotekeRes] = await Promise.all([
        fetch(
          `/api/ugovori?klijentId=${encodeURIComponent(klijentId)}&pozicijaId=${encodeURIComponent(potrebaId)}`
        ),
        fetch(`/api/potrebe/${encodeURIComponent(potrebaId)}/datoteke`),
      ]);

      const ugovoriPayload = (await ugovoriRes.json()) as UgovoriResponse;
      const datotekePayload = (await datotekeRes.json()) as PotrebaDatotekeResponse;

      if (!ugovoriRes.ok) {
        throw new Error(ugovoriPayload.error || 'Ne mogu dohvatiti ugovore potrebe.');
      }
      if (!datotekeRes.ok) {
        throw new Error(datotekePayload.error || 'Ne mogu dohvatiti datoteke potrebe.');
      }

      setUgovoriPotrebe(ugovoriPayload.ugovori || []);
      setZivotopisi(datotekePayload.zivotopisi || []);
      setOstaloDokumenti(datotekePayload.ostalo || []);
      setKandidatiCvSummary(datotekePayload.kandidatiCvSummary || []);
    } catch (error) {
      console.error('Greška pri dohvaćanju datoteka potrebe:', error);
      alert(error instanceof Error ? error.message : 'Ne mogu dohvatiti datoteke potrebe.');
    } finally {
      setUcitavanjeDatoteka(false);
    }
  };

  const dohvatiPodatke = async () => {
    setUcitavanje(true);
    const { data: pozicijaDataSaNacionalnostima, error: pozicijaGreska } = await supabase
      .from('pozicije')
      .select(
        '*, klijenti(id, naziv_tvrtke, oib, ulica, grad, email_ugovori), pozicije_nacionalnosti(nacionalnost_id, nacionalnosti_radnika(naziv))'
      )
      .eq('id', potrebaId)
      .single();

    let pozicijaData = pozicijaDataSaNacionalnostima;
    if (pozicijaGreska && jeNedostupnaRelacijaNacionalnosti(pozicijaGreska)) {
      const { data: fallbackPozicija } = await supabase
        .from('pozicije')
        .select('*, klijenti(id, naziv_tvrtke, oib, ulica, grad, email_ugovori)')
        .eq('id', potrebaId)
        .single();
      pozicijaData = fallbackPozicija;
    }

    const pozicijaSaNacionalnostima = pozicijaData
      ? {
          ...pozicijaData,
          nacionalnosti: izvuciNacionalnosti(pozicijaData),
          nacionalnosti_ids: izvuciNacionalnostiIdove(pozicijaData),
        }
      : null;

    const { data: kandidatiData } = await supabase
      .from('kandidati')
      .select('*')
      .eq('pozicija_id', potrebaId)
      .order('datum_slanja', { ascending: false });

    setPozicija(pozicijaSaNacionalnostima);
    setUvjeti(pozicijaSaNacionalnostima?.uvjeti_zaposlenja || '');
    setKandidati((kandidatiData || []) as KandidatRow[]);

    if (pozicijaSaNacionalnostima?.klijent_id) {
      await dohvatiDatotekePotrebe(String(pozicijaSaNacionalnostima.klijent_id));
    }

    setUcitavanje(false);
  };

  useEffect(() => {
    if (!potrebaId) return;
     
    void dohvatiPodatke();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potrebaId]);

  const uploadPotrebaDatoteke = async (params: {
    tip: PotrebaDokumentTip;
    file: File;
    kandidatId?: string;
  }) => {
    const { tip, file, kandidatId } = params;
    const formData = new FormData();
    formData.append('tip', tip);
    formData.append('file', file);
    if (kandidatId) formData.append('kandidatId', kandidatId);

    const response = await fetch(`/api/potrebe/${encodeURIComponent(potrebaId)}/datoteke/upload`, {
      method: 'POST',
      body: formData,
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || 'Upload dokumenta nije uspio.');
    }
  };

  const uploadZivotopisIzTaba = async () => {
    if (!odabraniKandidatZaCv || !odabraniCvFile || !pozicija?.klijent_id) {
      alert('Odaberi kandidata i životopis datoteku.');
      return;
    }
    setUploadingCv(true);
    try {
      await uploadPotrebaDatoteke({
        tip: 'zivotopis',
        file: odabraniCvFile,
        kandidatId: odabraniKandidatZaCv,
      });
      setOdabraniCvFile(null);
      await dohvatiDatotekePotrebe(String(pozicija.klijent_id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload životopisa nije uspio.');
    } finally {
      setUploadingCv(false);
    }
  };

  const uploadZivotopisZaKandidata = async (kandidatId: string, file: File | null) => {
    if (!file || !pozicija?.klijent_id) return;
    setUploadingCvKandidatId(kandidatId);
    try {
      await uploadPotrebaDatoteke({
        tip: 'zivotopis',
        file,
        kandidatId,
      });
      await dohvatiDatotekePotrebe(String(pozicija.klijent_id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload životopisa nije uspio.');
    } finally {
      setUploadingCvKandidatId(null);
    }
  };

  const uploadOstaloIzTaba = async () => {
    if (!odabraniOstaloFile || !pozicija?.klijent_id) {
      alert('Odaberi datoteku za upload.');
      return;
    }
    setUploadingOstalo(true);
    try {
      await uploadPotrebaDatoteke({
        tip: 'ostalo',
        file: odabraniOstaloFile,
      });
      setOdabraniOstaloFile(null);
      await dohvatiDatotekePotrebe(String(pozicija.klijent_id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload dokumenta nije uspio.');
    } finally {
      setUploadingOstalo(false);
    }
  };

  const spremiUvjete = async () => {
    setSpremanjeUvjeta(true);
    await supabase.from('pozicije').update({ uvjeti_zaposlenja: uvjeti }).eq('id', potrebaId);
    setSpremanjeUvjeta(false);
  };

  const generirajUgovorPDF = async () => {
    if (!pozicija) return;

    try {
      const rezultat = await generirajUgovorPdfDatoteka({
        klijent: {
          nazivTvrtke: pozicija.klijenti?.naziv_tvrtke || 'Nepoznati klijent',
          oib: pozicija.klijenti?.oib || '-',
          ulica: pozicija.klijenti?.ulica || '',
          grad: pozicija.klijenti?.grad || '',
        },
        pozicije: [
          {
            nazivPozicije: pozicija.naziv_pozicije,
            brojIzvrsitelja: pozicija.broj_izvrsitelja,
            cijenaPoKandidatu: pozicija.cijena_po_kandidatu,
            avansDogovoren: pozicija.avans_dogovoren,
            avansPostotak: pozicija.avans_postotak,
          },
        ],
        spremiLokalno: false,
      });

      const response = await fetch('/api/ugovori/spremi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klijentId: pozicija.klijent_id,
          pozicijaIds: [String(pozicija.id)],
          nazivDatoteke: rezultat.nazivDatoteke,
          pdfBase64: bytesToBase64(rezultat.pdfBytes),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Spremanje ugovora nije uspjelo.');
      }
      await dohvatiDatotekePotrebe(String(pozicija.klijent_id));
      alert('Ugovor je generiran i spremljen u datoteke potrebe i klijenta.');
    } catch (error) {
      console.error('Greška pri generiranju ugovora:', error);
      alert(error instanceof Error ? error.message : 'Došlo je do greške pri generiranju PDF ugovora.');
    }
  };

  const promijeniStatusKandidata = async (kandidatId: string, noviStatus: string) => {
    setKandidati((trenutni) =>
      trenutni.map((kandidat) =>
        kandidat.id === kandidatId ? { ...kandidat, status: noviStatus } : kandidat
      )
    );

    const { error } = await supabase.from('kandidati').update({ status: noviStatus }).eq('id', kandidatId);
    if (error) {
      alert('Došlo je do greške pri promjeni statusa.');
      void dohvatiPodatke();
    }
  };

  const promijeniStatusPotrebe = async () => {
    if (!pozicija) return;

    const trenutniStatus = normalizirajStatusPotrebe(pozicija.status);
    const noviStatus = trenutniStatus === 'Otvoreno' ? 'Zatvoreno' : 'Otvoreno';
    const prethodniStatus = pozicija.status;

    setMijenjanjeStatusaPotrebe(true);
    setPozicija((trenutna: any) => (trenutna ? { ...trenutna, status: noviStatus } : trenutna));

    const { error } = await supabase.from('pozicije').update({ status: noviStatus }).eq('id', pozicija.id);

    if (error) {
      alert('Došlo je do greške pri promjeni statusa potrebe.');
      setPozicija((trenutna: any) =>
        trenutna ? { ...trenutna, status: prethodniStatus } : trenutna
      );
    }

    setMijenjanjeStatusaPotrebe(false);
  };

  if (ucitavanje) return <div className="p-8 text-gray-500 dark:text-gray-400">Učitavanje pozicije...</div>;
  if (!pozicija) return <div className="p-8 text-red-500">Pozicija nije pronađena.</div>;
  const statusPotrebe = normalizirajStatusPotrebe(pozicija.status);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          {from === 'pretraga' ? 'Natrag na rezultate pretrage' : `Natrag na klijenta (${pozicija.klijenti?.naziv_tvrtke})`}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalUrediOtvoren(true)}
            className="flex items-center gap-2 bg-gray-100 dark:bg-[#05182d] hover:bg-gray-200 dark:hover:bg-[#07213E] text-brand-navy dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Pencil size={18} /> Uredi potrebu
          </button>
          <button
            onClick={() => void generirajUgovorPDF()}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <FileText size={20} /> Generiraj ugovor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-white">{pozicija.naziv_pozicije}</h1>
              <p className="text-brand-orange mt-1 font-medium">{pozicija.klijenti?.naziv_tvrtke}</p>
            </div>
            <button
              onClick={() => void promijeniStatusPotrebe()}
              disabled={mijenjanjeStatusaPotrebe}
              className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide border transition-colors disabled:opacity-60 ${dobijBojuStatusaPotrebe(statusPotrebe)}`}
              title="Klikni za promjenu statusa potrebe"
            >
              {mijenjanjeStatusaPotrebe ? 'Spremam...' : statusPotrebe}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow">
                <Users size={18} />
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                Ukupno traženo:{' '}
                <strong className="text-brand-navy dark:text-white text-base">{pozicija.broj_izvrsitelja} radnika</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow">
                <Globe size={18} />
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                Tip radnika:{' '}
                <strong className="text-brand-navy dark:text-white">{formatirajTipRadnika(pozicija.tip_radnika)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow">
                <Globe size={18} />
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                Nacionalnosti:{' '}
                <strong className="text-brand-navy dark:text-white">{formatirajNacionalnosti(pozicija.nacionalnosti)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow">
                <Calendar size={18} />
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                Datum upisa:{' '}
                <strong className="text-brand-navy dark:text-white">{formatirajDatum(pozicija.datum_upisa)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-yellow">
                <Euro size={18} />
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                Cijena po osobi:{' '}
                <strong className="text-brand-navy dark:text-white">{pozicija.cijena_po_kandidatu} €</strong>
              </span>
            </div>
            {pozicija.avans_dogovoren && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-[#05182d] rounded-lg text-brand-orange">
                  <Percent size={18} />
                </div>
                <span className="text-gray-600 dark:text-gray-300">
                  Avans: <strong className="text-brand-orange">{pozicija.avans_postotak}%</strong>{' '}
                  <span className="text-xs">
                    ({((pozicija.cijena_po_kandidatu * pozicija.avans_postotak) / 100).toFixed(2)} €/osobi)
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <FileText className="text-brand-yellow" size={20} /> Uvjeti zaposlenja
            </h2>
            <button
              onClick={spremiUvjete}
              disabled={spremanjeUvjeta}
              className="text-sm flex items-center gap-2 bg-gray-100 dark:bg-[#05182d] hover:bg-gray-200 dark:hover:bg-[#07213E] text-brand-navy dark:text-white px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <Save size={16} /> {spremanjeUvjeta ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
          <textarea
            value={uvjeti}
            onChange={(e) => setUvjeti(e.target.value)}
            placeholder="Ovdje upišite uvjete (npr. plaća 1200€ neto, osiguran smještaj, plaćen topli obrok, rad u smjenama...)"
            className="w-full flex-1 min-h-[150px] p-4 bg-gray-50 dark:bg-[#05182d] border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white resize-none text-sm leading-relaxed"
          ></textarea>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Users className="text-brand-yellow" /> Poslani kandidati
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Pregled svih kandidata proslijeđenih klijentu za ovu poziciju
            </p>
          </div>
          <button
            onClick={() => setModalOtvoren(true)}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus size={20} /> Dodaj kandidata
          </button>
        </div>

        {kandidati.length === 0 ? (
          <EmptyState icon={Users} title="Još nema poslanih kandidata" description="Kliknite na gumb iznad i unesite prvog kandidata." />
        ) : (
          <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                    <th className="py-4 px-6">Ime i prezime</th>
                    <th className="py-4 px-6">Nacionalnost</th>
                    <th className="py-4 px-6">Kontakt</th>
                    <th className="py-4 px-6">Životopis</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Datum slanja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {kandidati.map((kandidat) => {
                    const cvSummary = kandidatiCvSummaryById.get(kandidat.id);
                    const primaryCv = cvSummary?.primaryCv || null;

                    return (
                      <tr key={kandidat.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6 font-bold text-brand-navy dark:text-white">{kandidat.ime_prezime}</td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-brand-yellow" />
                            {kandidat.nacionalnost || '-'}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {kandidat.email && (
                            <div className="flex items-center gap-2">
                              <Mail size={12} /> {kandidat.email}
                            </div>
                          )}
                          {kandidat.telefon && (
                            <div className="flex items-center gap-2">
                              <Phone size={12} /> {kandidat.telefon}
                            </div>
                          )}
                          {!kandidat.email && !kandidat.telefon && '-'}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <div className="space-y-1">
                            {primaryCv ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <a
                                  href={pregledLinkZaDatoteku(primaryCv)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                >
                                  Pregled
                                </a>
                                <a
                                  href={preuzmiLinkZaDatoteku(primaryCv)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                >
                                  Preuzmi
                                </a>
                                <span className="text-xs text-gray-500 dark:text-gray-400">v{cvSummary?.versionsCount || 1}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">Nema životopisa</span>
                            )}
                            <label className="inline-flex items-center gap-1 text-xs text-brand-yellow hover:text-brand-orange cursor-pointer transition-colors">
                              <Upload size={12} />
                              {uploadingCvKandidatId === kandidat.id ? 'Upload...' : 'Upload nova verzija'}
                              <input
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  void uploadZivotopisZaKandidata(kandidat.id, file);
                                  event.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="relative inline-block">
                            <select
                              value={kandidat.status}
                              onChange={(e) => promijeniStatusKandidata(kandidat.id, e.target.value)}
                              className={`appearance-none cursor-pointer outline-none font-bold text-xs uppercase tracking-wide rounded-full px-4 py-1.5 border transition-all ${dobijBojuStatusa(kandidat.status)} pr-8`}
                            >
                              <option value="Poslano klijentu">Poslan klijentu</option>
                              <option value="Dogovoren razgovor">Dogovoren razgovor</option>
                              <option value="Zaposlen">Zaposlen</option>
                              <option value="Odbijen">Odbijen</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-50" />
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-gray-600 dark:text-gray-400 text-sm font-medium">
                          {formatirajDatum(kandidat.datum_slanja)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#0A2B50] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <FileText className="text-brand-yellow" /> Datoteke
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Datoteke povezane uz ovu potrebu</p>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex flex-wrap gap-2 rounded-xl bg-gray-100/80 dark:bg-[#05182d] p-1.5 border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setAktivniDatotekeTab('ugovor')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                aktivniDatotekeTab === 'ugovor'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#07213E]'
              }`}
            >
              Ugovor
            </button>
            <button
              type="button"
              onClick={() => setAktivniDatotekeTab('zivotopisi')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                aktivniDatotekeTab === 'zivotopisi'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#07213E]'
              }`}
            >
              Životopisi
            </button>
            <button
              type="button"
              onClick={() => setAktivniDatotekeTab('ostalo')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                aktivniDatotekeTab === 'ostalo'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#07213E]'
              }`}
            >
              Ostalo
            </button>
          </div>
        </div>

        <div className="p-6">
          {ucitavanjeDatoteka ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Učitavam datoteke...</div>
          ) : (
            <>
              {aktivniDatotekeTab === 'ugovor' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setOdabraniUgovorZaSlanje(ugovoriPotrebe[0]?.id || null);
                        setModalPosaljiOtvoren(true);
                      }}
                      disabled={ugovoriPotrebe.length === 0}
                      className="flex items-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Send size={16} /> Pošalji ugovor
                    </button>
                  </div>
                  {ugovoriPotrebe.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Nema ugovora za ovu potrebu.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                            <th className="py-4 px-4">Naziv</th>
                            <th className="py-4 px-4">Datum</th>
                            <th className="py-4 px-4 text-right">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {ugovoriPotrebe.map((ugovor) => (
                            <tr key={ugovor.id}>
                              <td className="py-3 px-4 font-medium text-brand-navy dark:text-white">
                                {ugovor.naziv_datoteke}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                {formatirajDatum(ugovor.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2 text-sm">
                                  <a
                                    href={pregledLinkZaDatoteku(ugovor)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    Pregled
                                  </a>
                                  <a
                                    href={preuzmiLinkZaDatoteku(ugovor)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    <Download size={13} /> Preuzmi
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOdabraniUgovorZaSlanje(ugovor.id);
                                      setModalPosaljiOtvoren(true);
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-navy/10 dark:bg-brand-yellow/15 text-brand-navy dark:text-brand-yellow hover:text-brand-orange transition-colors font-medium"
                                  >
                                    Pošalji ugovor
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {aktivniDatotekeTab === 'zivotopisi' && (
                <div className="space-y-5">
                  <div className="bg-gray-50 dark:bg-[#05182d] border border-gray-100 dark:border-gray-700 rounded-2xl p-4 sm:p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <select
                        value={odabraniKandidatZaCv}
                        onChange={(e) => setOdabraniKandidatZaCv(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-sm dark:text-white"
                      >
                        <option value="">Odaberi kandidata</option>
                        {kandidati.map((kandidat) => (
                          <option key={kandidat.id} value={kandidat.id}>
                            {kandidat.ime_prezime}
                          </option>
                        ))}
                      </select>
                      <input
                        type="file"
                        onChange={(event) => setOdabraniCvFile(event.target.files?.[0] || null)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => void uploadZivotopisIzTaba()}
                        disabled={uploadingCv || !odabraniKandidatZaCv || !odabraniCvFile}
                        className="inline-flex justify-self-start items-center justify-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Upload size={15} />
                        {uploadingCv ? 'Upload...' : 'Upload životopisa'}
                      </button>
                    </div>
                  </div>

                  {zivotopisi.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Nema životopisa za ovu potrebu.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                            <th className="py-4 px-4">Kandidat</th>
                            <th className="py-4 px-4">Naziv</th>
                            <th className="py-4 px-4">Verzija</th>
                            <th className="py-4 px-4">Datum</th>
                            <th className="py-4 px-4 text-right">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {zivotopisi.map((doc) => (
                            <tr key={doc.id}>
                              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                {doc.kandidat_ime_prezime || '-'}
                              </td>
                              <td className="py-3 px-4 font-medium text-brand-navy dark:text-white">
                                {doc.naziv_datoteke}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                v{doc.version}
                                {doc.is_primary ? ' (glavni)' : ''}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                {formatirajDatum(doc.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2 text-sm">
                                  <a
                                    href={pregledLinkZaDatoteku(doc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    Pregled
                                  </a>
                                  <a
                                    href={preuzmiLinkZaDatoteku(doc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    <Download size={13} />
                                    Preuzmi
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {aktivniDatotekeTab === 'ostalo' && (
                <div className="space-y-5">
                  <div className="bg-gray-50 dark:bg-[#05182d] border border-gray-100 dark:border-gray-700 rounded-2xl p-4 sm:p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <input
                        type="file"
                        onChange={(event) => setOdabraniOstaloFile(event.target.files?.[0] || null)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => void uploadOstaloIzTaba()}
                        disabled={uploadingOstalo || !odabraniOstaloFile}
                        className="inline-flex justify-self-start items-center justify-center gap-2 bg-brand-orange hover:bg-brand-yellow text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Upload size={15} />
                        {uploadingOstalo ? 'Upload...' : 'Upload datoteke'}
                      </button>
                    </div>
                  </div>

                  {ostaloDokumenti.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Nema ostalih datoteka za ovu potrebu.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                            <th className="py-4 px-4">Naziv</th>
                            <th className="py-4 px-4">Datum</th>
                            <th className="py-4 px-4 text-right">Akcije</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {ostaloDokumenti.map((doc) => (
                            <tr key={doc.id}>
                              <td className="py-3 px-4 font-medium text-brand-navy dark:text-white">{doc.naziv_datoteke}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                {formatirajDatum(doc.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2 text-sm">
                                  <a
                                    href={pregledLinkZaDatoteku(doc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    Pregled
                                  </a>
                                  <a
                                    href={preuzmiLinkZaDatoteku(doc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#05182d] text-brand-navy dark:text-white hover:text-brand-orange transition-colors"
                                  >
                                    <Download size={13} />
                                    Preuzmi
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalOtvoren && (
        <DodajKandidataModal
          pozicijaId={potrebaId}
          zatvoriModal={() => setModalOtvoren(false)}
          osvjeziListu={() => void dohvatiPodatke()}
        />
      )}
      {modalUrediOtvoren && (
        <UrediPozicijuModal
          pozicija={pozicija}
          zatvoriModal={() => setModalUrediOtvoren(false)}
          osvjeziPodatke={() => void dohvatiPodatke()}
        />
      )}
      <PosaljiUgovorModal
        otvoren={modalPosaljiOtvoren}
        zatvoriModal={() => setModalPosaljiOtvoren(false)}
        ugovori={ugovoriPotrebe}
        klijentNaziv={pozicija.klijenti?.naziv_tvrtke || ''}
        defaultTo={pozicija.klijenti?.email_ugovori || ''}
        odabraniUgovorId={odabraniUgovorZaSlanje}
        onPoslano={() => {
          alert('Ugovor je uspješno poslan.');
        }}
      />
    </div>
  );
}
