# Protalent (HR Agencija) - Upute za AI Agente

Ova datoteka sadrži ključne informacije o arhitekturi, tehnološkom stacku i poslovnoj logici aplikacije "Protalent" (HR Agencija). Koristi ove smjernice pri pisanju, refaktoriranju ili analiziranju koda.

## 1. Svrha projekta i domena
Protalent je interna web aplikacija namijenjena vođenju poslovanja HR agencije (zapošljavanje radnika). 
Glavni domenski entiteti su:
- **Klijenti:** Tvrtke s kojima agencija surađuje.
- **Potrebe:** Zahtjevi klijenata za zapošljavanjem određenog profila radnika (otvorene/zatvorene potrebe).
- **Pozicije:** Konkretna radna mjesta (uključuje tip radnika, nacionalnosti, itd.).
- **Kandidati:** Potencijalni radnici.
- **Ugovori:** Pravni dokumenti koji se generiraju, spremaju i šalju klijentima.
- **Prihodi:** Praćenje financijskog aspekta.
- **Integracije:** Povezivanje s vanjskim servisima (Google Drive za dokumente, SMTP za emailove).

## 2. Tehnološki Stack
- **Framework:** Next.js 16.1.6 (isključivo **App Router**)
- **UI & Stilovi:** React 19, Tailwind CSS v4, Lucide React (ikone), `next-themes` (Dark/Light mode).
- **Jezik:** TypeScript (striktno tipiziranje).
- **Baza podataka i Auth:** Supabase (PostgreSQL). Migracije se nalaze u `supabase/migrations/`.
- **Vanjski servisi i alati:**
  - `jspdf`: Za klijentsko/serversko generiranje PDF ugovora.
  - `nodemailer`: Za slanje emailova.
  - **Google Drive API**: Za automatsko kreiranje foldera i pohranu dokumenata (`scripts/google-oauth-refresh-token.mjs`).

## 3. Arhitektura i struktura mapa
Projekt prati standardnu Next.js strukturu s jasno odvojenim klijentskim i serverskim kodom:

- `/src/app/` - Next.js rute (App Router). Sadrži stranice (`page.tsx`), layoute, loading stateove i API rute (`/api/`).
- `/src/components/` - React komponente.
  - Koristimo Client i Server komponente. Datoteke koje koriste React hookove moraju imati `"use client"` direktivu na vrhu (npr. `...ClientView.tsx`, modali).
- `/src/lib/` - Pomoćne funkcije i servisi:
  - `/lib/server/` - Striktno serverski kod (Supabase admin klijent, Google Drive API, Nodemailer, generiranje ugovora). Ovdje se rješavaju tajne (secrets).
  - `/lib/client/` - Klijentske helper funkcije (npr. revalidacija cachea).
  - `/lib/types/` - Dijeljeni TypeScript tipovi i interface-i (`klijenti.ts`, `dokumenti.ts`).
  - `/lib/pdf/` - Logika za generiranje PDF ugovora.
- `/supabase/migrations/` - SQL skripte za promjene u bazi (pratiti konvenciju imenovanja `YYYYMMDDHHMM_opis.sql`).

## 4. Smjernice za pisanje koda (AI Guidelines)

### Next.js & React
1. **Server vs Client:** Preferiraj Server Komponente gdje god je moguće zbog performansi. Koristi `"use client"` samo na onim komponentama koje zahtijevaju interaktivnost (modali, forme, tablice sa sortiranjem, useState/useEffect).
2. **Data Fetching:** Podatke dohvaćaj na serveru (u `page.tsx`) i proslijedi ih klijentskim komponentama preko props-a.
3. **API Rute:** Smještene su u `src/app/api/...`. Koristi standardne HTTP metode (GET, POST, PUT, DELETE).
4. **Cache Revalidation:** Prilikom mutacije podataka (dodavanje klijenta, ažuriranje pozicije), obavezno koristi `revalidatePath` ili klijentski revalidate (kroz `src/lib/client/revalidateCache.ts`) kako bi se UI odmah ažurirao.

### TypeScript & Tipovi
1. Izbjegavaj `any`. Uvijek koristi ili definiraj odgovarajuće tipove iz `src/lib/types/`.
2. Supabase tipovi trebaju odgovarati stvarnoj shemi baze definiranoj u migracijama.

### Tailwind CSS v4
1. Projekt koristi Tailwind CSS v4. Obrati pažnju na nove konvencije koje donosi v4 u odnosu na v3 (npr. pojednostavljene konfiguracije u `app/globals.css`).

### Integracije i Vanjski API-ji
1. **Supabase:** Koristi `src/lib/supabase.ts` za klijentski pristup i `src/lib/server/supabase.ts` za siguran serverski pristup.
2. **Google Drive:** Logika folderinga (organizacije mapa) mora ostati konzistentna prema strukturi iz `src/lib/server/driveFoldering.ts`. Novi dokumenti uvijek se dodaju u ispravan podfolder klijenta/potrebe.
3. **Generiranje PDF-a:** Ukoliko se mijenja format ugovora, obavezno testiraj koordinate i fontove u `jspdf` instanci (`src/lib/pdf/generirajUgovorPdf.ts`), osiguraj UTF-8 podršku (hrvatska slova: č, ć, ž, š, đ). Fonts su učitani lokalno iz `/public/fonts/`.

## 5. Česti zadaci i protokoli
- **Dodavanje novog entiteta:** 1. Kreiraj migraciju u `/supabase/migrations/`.
  2. Ažuriraj TS tipove u `/src/lib/types/`.
  3. Kreiraj API rutu ako je potrebno.
  4. Kreiraj Server/Client view komponente.
- **Rukovanje greškama:** API rute moraju vraćati jasne JSON greške (`{ error: string }`) s odgovarajućim HTTP status kodovima (400, 401, 500). Klijent ih mora uloviti i prikazati (npr. preko toast notifikacija).