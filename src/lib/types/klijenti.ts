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
