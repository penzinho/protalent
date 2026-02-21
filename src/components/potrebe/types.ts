export interface GrupiranaPotrebaRow {
  kljuc: string;
  naziv: string;
  brojPotreba: number;
  brojKlijenata: number;
  ukupnoRadnika: number;
  prosjecnaCijena: number;
  tipoviRadnika: string[];
  nacionalnosti: string[];
}

export interface PotrebaPoNacionalnostiRow {
  nacionalnost: string;
  tipRadnika: string;
  kljuc: string;
  naziv: string;
  klijentNaziv: string;
  brojRadnika: number;
  cijena: number;
}
