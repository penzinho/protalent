export type PotrebaDokumentTip = 'zivotopis' | 'ostalo';

export interface PotrebaDokument {
  id: string;
  klijent_id: string;
  pozicija_id: string;
  kandidat_id: string | null;
  tip: PotrebaDokumentTip;
  naziv_datoteke: string;
  mime_type: string;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  folder_name: string;
  is_primary: boolean;
  version: number;
  created_at: string;
  kandidat_ime_prezime?: string | null;
}

export interface KandidatCvSummary {
  kandidatId: string;
  kandidatImePrezime: string;
  versionsCount: number;
  primaryCv: PotrebaDokument | null;
}
