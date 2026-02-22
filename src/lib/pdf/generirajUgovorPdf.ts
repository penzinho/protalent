import { jsPDF } from 'jspdf';

export interface UgovorKlijent {
  nazivTvrtke: string;
  oib?: string | null;
  ulica?: string | null;
  grad?: string | null;
  direktor?: string | null;
}

export interface UgovorPozicija {
  nazivPozicije: string;
  brojIzvrsitelja: number;
  cijenaPoKandidatu: number;
  avansDogovoren?: boolean | null;
  avansPostotak?: number | null;
  lokacija?: string | null;
  ugovor?: string | null;
  radnoVrijeme?: string | null;
  placa?: string | null;
  smjestaj?: string | null;
}

interface GenerirajUgovorPdfOpcije {
  klijent: UgovorKlijent;
  pozicije: UgovorPozicija[];
  nazivDatoteke?: string;
}

export interface GeneriraniUgovorPdf {
  nazivDatoteke: string;
  pdfBytes: Uint8Array;
}

const FONT_OBITELJ = 'OpenSans';
const GORNJA_MARGINA = 20;
const DONJA_MARGINA = 280;
const LIJEVA_MARGINA = 20;

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

// Funkcija za običan tekst s podrškom za justify
const upisiTekst = (
  doc: jsPDF,
  tekst: string,
  yPozicija: number,
  opcije?: { x?: number; maxSirina?: number; visinaLinije?: number; bold?: boolean; align?: 'left' | 'center' | 'right' | 'justify' }
): number => {
  const {
    x = LIJEVA_MARGINA,
    maxSirina = 170,
    visinaLinije = 6,
    bold = false,
    align = 'left'
  } = opcije || {};

  doc.setFont(FONT_OBITELJ, bold ? 'bold' : 'normal');
  const linije = doc.splitTextToSize(tekst, maxSirina);
  const stvarniX = align === 'center' ? 105 : x; 
  
  yPozicija = osigurajProstor(doc, yPozicija, linije.length * visinaLinije);
  
  if (align === 'justify') {
    doc.text(tekst, stvarniX, yPozicija, { align: 'justify', maxWidth: maxSirina });
  } else {
    doc.text(linije, stvarniX, yPozicija, { align });
  }
  
  return yPozicija + linije.length * visinaLinije;
};

// Nova funkcija za članke/stavke - broj (1.1.) ispisuje BOLD, tekst je JUSTIFY uvučeno
const upisiStavak = (
  doc: jsPDF,
  broj: string,
  tekst: string,
  yPozicija: number,
  opcije?: { indent?: number }
): number => {
  const indent = opcije?.indent || 0;
  
  doc.setFont(FONT_OBITELJ, 'bold');
  const sirinaBroja = doc.getTextWidth(broj) + 2; 
  const xBroj = LIJEVA_MARGINA + indent;
  const xTekst = xBroj + sirinaBroja;
  const maxSirinaTeksta = 170 - indent - sirinaBroja;
  const visinaLinije = 6;

  doc.setFont(FONT_OBITELJ, 'normal'); 
  const linije = doc.splitTextToSize(tekst, maxSirinaTeksta);
  yPozicija = osigurajProstor(doc, yPozicija, linije.length * visinaLinije);

  doc.setFont(FONT_OBITELJ, 'bold');
  doc.text(broj, xBroj, yPozicija);

  doc.setFont(FONT_OBITELJ, 'normal');
  doc.text(tekst, xTekst, yPozicija, { align: 'justify', maxWidth: maxSirinaTeksta });

  return yPozicija + linije.length * visinaLinije;
};

// Nova funkcija za natuknice (bullet points) unutar jamstva
const upisiMetak = (doc: jsPDF, tekst: string, yPozicija: number): number => {
  const xMetak = LIJEVA_MARGINA + 10;
  const xTekst = LIJEVA_MARGINA + 15;
  const maxSirinaTeksta = 170 - 15;
  const visinaLinije = 6;

  const linije = doc.splitTextToSize(tekst, maxSirinaTeksta);
  yPozicija = osigurajProstor(doc, yPozicija, linije.length * visinaLinije);

  doc.text('-', xMetak, yPozicija);
  doc.text(tekst, xTekst, yPozicija, { align: 'justify', maxWidth: maxSirinaTeksta });

  return yPozicija + linije.length * visinaLinije;
};

const siguranNaziv = (vrijednost: string): string => {
  const bezDijakritika = vrijednost.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const procisceno = bezDijakritika.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
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

export const generirajUgovorPdfDatoteka = async ({
  klijent,
  pozicije,
  nazivDatoteke,
  spremiLokalno = false,
}: GenerirajUgovorPdfOpcije & { spremiLokalno?: boolean }): Promise<GeneriraniUgovorPdf> => {
  if (!pozicije.length) {
    throw new Error('Nema odabranih pozicija za ugovor.');
  }

  const doc = new jsPDF();
  await ucitajOpenSansFontove(doc);

  let yPos = GORNJA_MARGINA;
  const danasnjiDatum = new Date().toLocaleDateString('hr-HR');
  const adresaKlijenta = [klijent.ulica, klijent.grad].filter(Boolean).join(', ') || '-';
  const nazivPozicija = pozicije.map(p => p.nazivPozicije).join(', ');

  // UVOD
  doc.setFontSize(10);
  yPos = upisiTekst(doc, 'PROTALENT d.o.o., Vlaška ulica 84, Zagreb, OIB: 99779228652, koje zastupa prokurist Luka Miletić (u nastavku: Agencija)', yPos, { align: 'justify' });
  yPos = upisiTekst(doc, 'i', yPos, { align: 'center' });
  yPos = upisiTekst(doc, `${klijent.nazivTvrtke}, ${adresaKlijenta}, OIB: ${klijent.oib || '-'}, koje zastupa direktor ${klijent.direktor || '_________________'} (u nastavku: Korisnik)`, yPos, { align: 'justify' });
  
  yPos += 5;
  // Promijenjeno align na 'left'
  yPos = upisiTekst(doc, `sklopili su dana ${danasnjiDatum}.g. sljedeći`, yPos, { align: 'left' });
  yPos += 10;

  // NASLOV
  doc.setFontSize(14);
  yPos = upisiTekst(doc, 'UGOVOR O SURADNJI', yPos, { bold: true, align: 'center' });
  doc.setFontSize(11);
  yPos = upisiTekst(doc, 'za uslugu traženja i selekcije kandidata za radna mjesta', yPos, { align: 'center' });
  // Dodan odmak za jedan red (5) prije naziva pozicije
  yPos += 5; 
  doc.setFontSize(12);
  yPos = upisiTekst(doc, `„${nazivPozicija}“`, yPos, { bold: true, align: 'center' });
  yPos += 10;

  doc.setFontSize(10);

  // ČLANAK 1
  yPos = upisiTekst(doc, 'Predmet ugovora', yPos, { bold: true, align: 'center' });
  yPos = upisiTekst(doc, 'Članak 1.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  yPos = upisiStavak(doc, '1.1.', 'Ugovorne strane potvrđuju da je Agencija specijalizirana za obavljanje usluge traženja i selekcije kandidata te da će, sukladno ovom ugovoru, izvršiti uslugu za Korisnika. Postupci koji su predmet ovog ugovora i koje će Agencija provoditi za Korisnika navedeni su u članku 2. ovog ugovora.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '1.2.', `Ovim ugovorom definira se poslovna suradnja između Agencije i Korisnika u postupku Traženja i selekcije kadra/kandidata za radno mjesto – ${nazivPozicija}.`, yPos);
  yPos += 5;

  // ČLANAK 2
  yPos = upisiTekst(doc, 'Opis usluge', yPos, { bold: true, align: 'center' });
  yPos = upisiTekst(doc, 'Članak 2.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  yPos = upisiStavak(doc, '2.1.', 'Usluga traženja i selekcije kandidata odvija se u dvije faze:', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '1. faza:', 'analiza i upoznavanje specifičnosti industrije i traženih radnih mjesta, prikupljanje svih specifičnih karakteristika za traženo radno mjesto, priprema strategije traženja i selekcije, pregled tržišta, priprema oglasa i oglašavanje, kontaktiranje "pasivnih tražitelja posla", provođenje strukturiranih selekcijskih intervjua, provjera referenci kandidata i priprema liste kandidata koji najbliže odgovaraju zahtjevima Korisnika.', yPos, { indent: 10 });
  // Ovdje je uklonjen "yPos += 2;" kako bi razmak između faza bio manji
  yPos = upisiStavak(doc, '2. faza:', 'nakon provedenih intervjua, Agencija predstavlja Korisniku prikaz najboljih kandidata na tržištu rada po trenutno traženim uvjetima. Temeljem predstavljene liste kandidata, slijede razgovori i provjere kandidata od strane Korisnika. U završnoj fazi, Korisnik odabire/potvrđuje one kandidate za koje smatra da najbolje odgovaraju zahtjevima radnog mjesta.', yPos, { indent: 10 });
  yPos += 2;
  yPos = upisiStavak(doc, '2.2.', 'Po potrebi i u dogovoru s Korisnikom, može se provesti psihološko testiranje kandidata. Psihološko testiranje provodi se u finalnoj fazi samo s odabranim kandidatima, a cijena psiholoških testiranja nije uključena u ugovorenu cijenu usluge i dodatno se naplaćuje po važećem cjeniku Agencije. Ukoliko se Korisnik odluči na provođenje psihološkog testiranja, ugovorne strane će sastaviti dodatak ovom ugovoru u kojem će ugovoriti cijenu i sve bitne sastojke za provođenje istoga.', yPos);
  yPos += 5;

  // ČLANAK 3
  yPos = upisiTekst(doc, 'Članak 3.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  yPos = upisiStavak(doc, '3.1.', 'Uvjet za početak provedbe usluge je potpisani ugovor o suradnji te dodatak 1. ugovoru - specifikacije traženih radnih pozicija. Dodatak 1 je sastavni dio ovog ugovora, a ispunjava ga Korisnik ili Agencija sukladno podacima dobivenim od Korisnika.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '3.2.', 'Agencija se obvezuje da će u roku do 20 radnih dana od trenutka potpisa i sklapanja ugovora izvršiti fazu 1 i početni dio faze 2 - predstavljanje liste kandidata. U komunikaciji i dogovoru s Korisnikom, rokovi se mogu suglasno produžiti.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '3.3.', 'Korisnik se obvezuje da će izvršiti razgovore s kandidatima koji ispunjavaju uvjete navedene u Dodatku 1 ugovora u roku od najviše 5 radnih dana od trenutka predstavljanja liste kandidata. Korisnik se obvezuje da će u roku od najviše 10 radnih dana od dana zadnjeg testiranja kandidata donijeti odluku o izboru kandidata. U slučaju provođenja psihološkog testiranja kandidata u užem izboru, navedeni rok se računa od dana dostave rezultata testiranja Korisniku.', yPos);
  yPos += 5;

  // ČLANAK 4 (CIJENA)
  yPos = upisiTekst(doc, 'Cijena', yPos, { bold: true, align: 'center' });
  yPos = upisiTekst(doc, 'Članak 4.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  
  const tekstCijena = pozicije.length === 1 
    ? `${pozicije[0].cijenaPoKandidatu} € po zaposlenom kandidatu` 
    : pozicije.map(p => `${p.cijenaPoKandidatu} € za poziciju ${p.nazivPozicije}`).join(', ');

  yPos = upisiStavak(doc, '4.1.', `Ugovorena cijena za ukupno izvršenu uslugu iznosi ${tekstCijena} te je ista fiksna i nepromjenjiva.`, yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '4.2.', 'Agencija će Korisniku izdati račun za svoje usluge na dan potpisa ugovora o radu između Korisnika i odabranog Kandidata, sve po izvršenju 2. faze usluga iz čl. 2.1. ovog ugovora.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '4.3.', 'Ukoliko Korisnik izabere više od jednog kandidata, za svakog sljedećeg izabranog kandidata naplaćuje se puna cijena iz čl. 4.1. ovog ugovora.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '4.4.', 'Ukoliko Korisnik nakon što mu Agencija predstavi prikaz kandidata selekcioniranih sukladno njegovim potrebama i Dodatku 1 ovog ugovora ne odluči zaposliti niti jednog od ponuđenih kandidata, nije obavezan platiti ugovorenu cijenu. U slučaju da Korisnik u roku od 12 mjeseci od dana sklapanja ovog ugovora, sa ili bez sudjelovanja Agencije, zaposli bilo kojeg od kandidata koje mu je predstavila Agencija, na bilo koje radno mjesto, dužan je Agenciji isplatiti punu ugovorenu cijenu.', yPos);
  // Ovdje je uklonjen "yPos += 2;" kako bi razmak između 4.4 i 4.5 bio manji
  yPos = upisiStavak(doc, '4.5.', 'Svi navedeni iznosi su bez PDV-a te se na tu cijenu Korisniku obračunava PDV ukoliko je Agencija obveznik istoga. Rok dospijeća plaćanja računa iznosi 8 dana od dana ispostave računa.', yPos);
  yPos += 5;

  // ČLANAK 5 (JAMSTVO)
  yPos = upisiTekst(doc, 'Jamstvo', yPos, { bold: true, align: 'center' });
  yPos = upisiTekst(doc, 'Članak 5.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  yPos = upisiStavak(doc, '5.1.', 'Ukoliko izabrani kandidat/kandidati u razdoblju od mjesec dana od datuma sklapanja ugovora o radu s Korisnikom ne ispuni/e očekivanja Korisnika odnosno samostalno odluče otkazati ugovor o radu, Agencija ponovno pokreće postupak traženja i selekcije kadra bez naplaćivanja dodatnih troškova.', yPos);
  // Ovdje je uklonjen "yPos += 2;" kako bi razmak između 5.1 i 5.2 bio manji
  yPos = upisiStavak(doc, '5.2.', 'Garancija se ne može primijeniti ako Korisnik:', yPos);
  yPos += 2;
  yPos = upisiMetak(doc, 'nije u dogovorenim rokovima izvršio svoje financijske obveze prema Agenciji ili kandidatu,', yPos);
  yPos = upisiMetak(doc, 'nije pisanim putem obavijestio Agenciju o prekidu radnog odnosa s kandidatom unutar 3 dana od dana prekida,', yPos);
  yPos = upisiMetak(doc, 'nije ispunio dogovorene uvjete prema kandidatu ili ih je naknadno promijenio,', yPos);
  yPos = upisiMetak(doc, 'je prekinuo radni odnos s kandidatom iz poslovnih razloga ili je kandidat raskinuo ugovor iz razloga na strani Korisnika,', yPos);
  yPos = upisiMetak(doc, 'je prekršio zakonom zajamčena prava Kandidata.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '5.3.', 'Agencija se obvezuje da neće nuditi nova zaposlenja kandidatima koje je Korisnik zaposlio.', yPos);
  yPos += 5;

  // ČLANAK 6
  yPos = upisiTekst(doc, 'Članak 6.', yPos, { bold: true, align: 'center' });
  yPos += 3;
  yPos = upisiStavak(doc, '6.1.', 'Ugovorne strane će nastojati riješiti sve sporove mirnim putem. Ako dogovor ne bude moguć, nadležan je sud u Zagrebu.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '6.2.', 'Ugovor se sastoji od dva istovjetna primjerka, od kojih svaka ugovorna strana zadržava po jedan primjerak.', yPos);
  yPos += 2;
  yPos = upisiStavak(doc, '6.3.', 'Ugovor stupa na snagu danom sklapanja, odnosno potpisa obiju ugovornih strana.', yPos);
  yPos += 15;

  // POTPISI 
  yPos = osigurajProstor(doc, yPos, 45);
  const lijeviX = 30;
  const desniX = 115; 

  doc.setFont(FONT_OBITELJ, 'bold');
  doc.text('Agencija:', lijeviX, yPos);
  doc.text('Korisnik:', desniX, yPos);
  yPos += 15;

  doc.setFont(FONT_OBITELJ, 'normal');
  doc.text('…………………………..', lijeviX, yPos);
  doc.text('…………………………..', desniX, yPos);
  yPos += 6;
  
  doc.text('Protalent d.o.o.,', lijeviX, yPos);
  
  const klijentTvrtkaLinije = doc.splitTextToSize(`${klijent.nazivTvrtke},`, 75);
  doc.text(klijentTvrtkaLinije, desniX, yPos);
  
  const tvrtkaVisina = Math.max(1, klijentTvrtkaLinije.length) * 6;
  yPos += tvrtkaVisina;

  doc.text('zastupani po prokuristu', lijeviX, yPos);
  doc.text('zastupani po direktoru,', desniX, yPos);
  yPos += 6;

  doc.text('Luki Miletiću', lijeviX, yPos);
  doc.text(`${klijent.direktor || ''}`, desniX, yPos);

  // ---------------------------------------------------------------------------------
  // DODATAK
  // ---------------------------------------------------------------------------------
  
  for (const pozicija of pozicije) {
    doc.addPage();
    let dYPos = GORNJA_MARGINA + 10;
    
    doc.setFontSize(12);
    dYPos = upisiTekst(doc, 'DODATAK – SPECIFIKACIJA TRAŽENIH RADNIH POZICIJA', dYPos, { bold: true, align: 'center' });
    dYPos += 10;
    
    dYPos = upisiTekst(doc, pozicija.nazivPozicije.toUpperCase(), dYPos, { bold: true, align: 'center' });
    dYPos += 15;
    
    doc.setFontSize(10);
    dYPos = upisiTekst(doc, `Pozicija: ${pozicija.nazivPozicije}`, dYPos);
    dYPos = upisiTekst(doc, `Broj izvršitelja: ${pozicija.brojIzvrsitelja}`, dYPos);
    dYPos = upisiTekst(doc, `Lokacija: ${pozicija.lokacija || '___________________'}`, dYPos);
    dYPos = upisiTekst(doc, `Ugovor: ${pozicija.ugovor || '___________________'}`, dYPos);
    dYPos = upisiTekst(doc, `Radno vrijeme: ${pozicija.radnoVrijeme || '___________________'}`, dYPos);
    dYPos = upisiTekst(doc, `Plaća: ${pozicija.placa || '___________________'}`, dYPos);
    dYPos = upisiTekst(doc, `Smještaj: ${pozicija.smjestaj || '___________________'}`, dYPos);
  }

  const zavrsniNazivDatoteke = nazivDatoteke || generirajNazivDatoteke(klijent, pozicije);
  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBytes = new Uint8Array(pdfArrayBuffer);

  if (spremiLokalno) {
    doc.save(zavrsniNazivDatoteke);
  }

  return {
    nazivDatoteke: zavrsniNazivDatoteke,
    pdfBytes,
  };
};

export const generirajUgovorPdf = async (opcije: GenerirajUgovorPdfOpcije): Promise<string> => {
  const rezultat = await generirajUgovorPdfDatoteka({
    ...opcije,
    spremiLokalno: true,
  });
  return rezultat.nazivDatoteke;
};
