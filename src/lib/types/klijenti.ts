export interface KlijentOverview {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  oib: string;
  grad: string | null;
  industrija: string | null;
  brojPozicija: number;
  brojKandidata: number;
}

export interface KlijentiOverviewRow {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  oib: string;
  grad: string | null;
  industrija: string | null;
  broj_pozicija_otvoreno: number | string | null;
  broj_kandidata_otvoreno: number | string | null;
}

export interface KlijentDetalji {
  id: string;
  naziv_tvrtke: string;
  skraceni_naziv: string | null;
  industrija: string | null;
  oib: string;
  mbs: string | null;
  ulica: string | null;
  grad: string | null;
  email_ugovori: string | null;
}

export interface PozicijaDetalji {
  id: string;
  klijent_id: string;
  naziv_pozicije: string;
  broj_izvrsitelja: number;
  datum_upisa: string;
  tip_radnika: 'domaci' | 'strani' | 'strani_u_rh';
  nacionalnosti: string[];
  cijena_po_kandidatu: number;
  avans_dogovoren: boolean;
  avans_postotak: number | null;
  status: string | null;
}

export interface UgovorDokument {
  id: string;
  klijent_id: string;
  naziv_datoteke: string;
  mime_type: string;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  pozicije_ids: string[];
  pozicije_nazivi: string[];
  lokacije?: UgovorDokumentLokacija[];
  created_at: string;
}

export interface UgovorDokumentLokacija {
  id: string;
  ugovor_id: string;
  pozicija_id: string;
  datum_upisa: string | null;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  folder_name: string;
  created_at: string;
  pozicija_naziv?: string;
}

export interface KlijentAktivnost {
  id: string;
  klijent_id: string;
  akcija:
    | 'KLIJENT_DODAN'
    | 'POTREBA_DODANA'
    | 'UGOVOR_GENERIRAN'
    | 'UGOVOR_POSLAN'
    | 'UGOVOR_OBRISAN'
    | 'KANDIDAT_DODAN'
    | 'KANDIDAT_STATUS_PROMIJENJEN';
  opis: string;
  user_label: string;
  event_at: string;
  metadata?: Record<string, unknown> | null;
}
