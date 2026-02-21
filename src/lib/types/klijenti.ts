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
