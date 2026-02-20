import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oib = searchParams.get('oib');

  if (!oib || oib.length !== 11) {
    return NextResponse.json({ error: 'Nevažeći OIB. OIB mora sadržavati 11 znamenki.' }, { status: 400 });
  }

  try {
    const clientId = process.env.SUDREG_CLIENT_ID;
    const clientSecret = process.env.SUDREG_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('API ključevi nedostaju. Provjerite .env.local datoteku.');
    }

    // 1. DOHVAT TOKENA
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://sudreg-data.gov.hr/api/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}` 
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error("Token greška:", await tokenResponse.text());
      throw new Error('Neuspješna autorizacija. Provjerite Client ID i Secret.');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. DOHVAT PODATAKA O TVRTKI
    const url = `https://sudreg-data.gov.hr/api/javni/detalji_subjekta?tip_identifikatora=oib&identifikator=${oib}`;
    
    const companyResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!companyResponse.ok) {
      if (companyResponse.status === 404) {
        throw new Error('Tvrtka s ovim OIB-om nije pronađena u sudskom registru.');
      }
      throw new Error(`Greška pri dohvatu podataka: ${companyResponse.statusText}`);
    }

    // Čitamo JSON odgovor (Samo JEDNOM!)
    const companyData = await companyResponse.json();

    // 3. MAPIRANJE I VRAĆANJE FORMATIRANIH PODATAKA
    
    // 3. MAPIRANJE I VRAĆANJE FORMATIRANIH PODATAKA
    
    // Dohvaćamo puno ime
    const punoIme = companyData.tvrtka?.ime || '';
    
    // Dohvaćamo skraćeno ime (ako tvrtka nema skraćeno ime, koristimo puno)
    const skracenoIme = companyData.skracena_tvrtka?.ime || punoIme;

    // Registar adresu drži u objektu 'sjediste'
    const sjediste = companyData.sjediste || {};
    
    // Spajamo ulicu i kućni broj
    const ulicaIme = sjediste.ulica || sjediste.naselje || '';
    const kucniBroj = sjediste.kucni_broj || '';
    const podBroj = sjediste.kucni_podbroj || '';
    const punaUlica = `${ulicaIme} ${kucniBroj}${podBroj}`.trim();

    // Spajamo poštanski broj i grad
    const postanskiBroj = sjediste.postanski_broj || '';
    const nazivGrada = sjediste.naziv_naselja || sjediste.naziv_opcine || '';
    const puniGrad = `${postanskiBroj} ${nazivGrada}`.trim();

    return NextResponse.json({
      naziv_tvrtke: punoIme,
      skraceni_naziv: skracenoIme, // Dodali smo skraćeni naziv
      mbs: companyData.mbs || '',
      oib: companyData.oib || oib,
      ulica: punaUlica,
      grad: puniGrad,
    });
    
  } catch (error: any) {
    console.error("Sudreg API Error:", error);
    return NextResponse.json({ error: error.message || 'Dogodila se neočekivana greška.' }, { status: 500 });
  }
}