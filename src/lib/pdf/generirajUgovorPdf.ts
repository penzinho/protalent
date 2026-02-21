import { jsPDF } from 'jspdf';

export interface UgovorKlijent {
  nazivTvrtke: string;
  oib?: string | null;
  ulica?: string | null;
  grad?: string | null;
}

export interface UgovorPozicija {
  nazivPozicije: string;
  brojIzvrsitelja: number;
  cijenaPoKandidatu: number;
  avansDogovoren?: boolean | null;
  avansPostotak?: number | null;
}

interface GenerirajUgovorPdfOpcije {
  klijent: UgovorKlijent;
  pozicije: UgovorPozicija[];
  nazivDatoteke?: string;
}

const FONT_OBITELJ = 'OpenSans';
const GORNJA_MARGINA = 20;
const DONJA_MARGINA = 280;

const pretvoriUBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
};

const ucitajOpenSansFontove = async (doc: jsPDF): Promise<void> => {
  const [regularResponse, boldResponse] = await Promise.all([
    fetch('/fonts/OpenSans-Regular.ttf'),
    fetch('/fonts/OpenSans-Bold.ttf'),
  ]);

  if (!regularResponse.ok || !boldResponse.ok) {
    throw new Error('Ne mogu učitati Open Sans fontove');
  }

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ]);

  doc.addFileToVFS('OpenSans-Regular.ttf', pretvoriUBase64(regularBuffer));
  doc.addFont('OpenSans-Regular.ttf', FONT_OBITELJ, 'normal');
  doc.addFileToVFS('OpenSans-Bold.ttf', pretvoriUBase64(boldBuffer));
  doc.addFont('OpenSans-Bold.ttf', FONT_OBITELJ, 'bold');
};

const osigurajProstor = (doc: jsPDF, yPozicija: number, potrebanProstor: number): number => {
  if (yPozicija + potrebanProstor <= DONJA_MARGINA) {
    return yPozicija;
  }

  doc.addPage();
  return GORNJA_MARGINA;
};

const upisiTekst = (
  doc: jsPDF,
  tekst: string,
  x: number,
  yPozicija: number,
  maxSirina = 170,
  visinaLinije = 7,
): number => {
  const linije = doc.splitTextToSize(tekst, maxSirina);
  doc.text(linije, x, yPozicija);
  return yPozicija + linije.length * visinaLinije;
};

const siguranNaziv = (vrijednost: string): string => {
  const bezDijakritika = vrijednost
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const procisceno = bezDijakritika
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return procisceno || 'ugovor';
};

const generirajNazivDatoteke = (klijent: UgovorKlijent, pozicije: UgovorPozicija[]): string => {
  const klijentDio = siguranNaziv(klijent.nazivTvrtke);

  if (pozicije.length === 1) {
    const pozicijaDio = siguranNaziv(pozicije[0]?.nazivPozicije || 'pozicija');
    return `Ugovor_${klijentDio}_${pozicijaDio}.pdf`;
  }

  return `Ugovor_${klijentDio}.pdf`;
};

export const generirajUgovorPdf = async ({
  klijent,
  pozicije,
  nazivDatoteke,
}: GenerirajUgovorPdfOpcije): Promise<string> => {
  if (!pozicije.length) {
    throw new Error('Nema odabranih pozicija za ugovor.');
  }

  const doc = new jsPDF();
  await ucitajOpenSansFontove(doc);

  let yPos = GORNJA_MARGINA;

  doc.setFontSize(16);
  doc.setFont(FONT_OBITELJ, 'bold');
  doc.text('UGOVOR O POSREDOVANJU PRI ZAPOŠLJAVANJU', 105, yPos, { align: 'center' });

  yPos += 20;
  doc.setFontSize(12);
  doc.setFont(FONT_OBITELJ, 'normal');

  yPos = upisiTekst(doc, `Naručitelj: ${klijent.nazivTvrtke}`, 20, yPos);
  yPos = upisiTekst(doc, `OIB: ${klijent.oib || '-'}`, 20, yPos);

  const adresa = [klijent.ulica, klijent.grad].filter(Boolean).join(', ');
  yPos = upisiTekst(doc, `Adresa: ${adresa || '-'}`, 20, yPos);
  yPos += 8;

  yPos = upisiTekst(
    doc,
    'Predmet ovog ugovora je posredovanje pri zapošljavanju za sljedeće pozicije:',
    20,
    yPos,
  );
  yPos += 3;

  pozicije.forEach((pozicija, index) => {
    yPos = osigurajProstor(doc, yPos, 38);

    doc.setFont(FONT_OBITELJ, 'bold');
    yPos = upisiTekst(doc, `${index + 1}. Pozicija: ${pozicija.nazivPozicije}`, 25, yPos, 165);

    doc.setFont(FONT_OBITELJ, 'normal');
    yPos = upisiTekst(doc, `- Traženi broj izvršitelja: ${pozicija.brojIzvrsitelja}`, 28, yPos, 160);
    yPos = upisiTekst(doc, `- Cijena po kandidatu: ${pozicija.cijenaPoKandidatu} EUR`, 28, yPos, 160);

    if (pozicija.avansDogovoren && typeof pozicija.avansPostotak === 'number' && pozicija.avansPostotak > 0) {
      const avansIznos = (pozicija.cijenaPoKandidatu * pozicija.avansPostotak) / 100;
      yPos = upisiTekst(
        doc,
        `- Dogovoren avans: ${pozicija.avansPostotak}% (što iznosi ${avansIznos.toFixed(2)} EUR po osobi)`,
        28,
        yPos,
        160,
      );
    }

    yPos += 4;
  });

  yPos = osigurajProstor(doc, yPos + 10, 55);
  yPos += 10;

  doc.setFont(FONT_OBITELJ, 'bold');
  doc.text('Članak 2.', 20, yPos);

  doc.setFont(FONT_OBITELJ, 'normal');
  yPos += 47;
  doc.text('Za Agenciju:', 40, yPos);
  doc.text('Za Naručitelja:', 140, yPos);

  const zavrsniNazivDatoteke = nazivDatoteke || generirajNazivDatoteke(klijent, pozicije);
  doc.save(zavrsniNazivDatoteke);
  return zavrsniNazivDatoteke;
};
