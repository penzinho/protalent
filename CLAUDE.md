# CLAUDE.md — HR Agencija

Ovo je interna HR agencijska web aplikacija za upravljanje klijentima, radnim pozicijama i kandidatima. Namijenjena je jednoj agenciji koja posreduje u zapošljavanju domaćih i stranih radnika.

---

## Tech stack

| Kategorija | Tehnologija |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Jezik | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Baza | Supabase (PostgreSQL) |
| Ikone | Lucide React |
| Tema | next-themes (light/dark/system) |
| PDF | jsPDF |
| Email | Nodemailer |
| Cloud storage | Google Drive API |

---

## Brand dizajn

### Boje (definirane u `src/app/globals.css`)
- **Navy** `#07213E` — primarna tamna boja, tekst, sidebar pozadina
- **Orange** `#E76518` — akcenti, CTA gumbi, hover stanja
- **Yellow** `#F49E17` — ikone, focus ring, highlights

### Dark mode boje pozadina
- Stranice: `bg-[#05182d]`
- Kartice/modali: `bg-[#0A2B50]`
- Sidebar: `bg-[#07213E]`
- Dublje pozadine unutar kartica: `bg-[#05182d]`

### Klase koje se koriste

```
bg-brand-navy / text-brand-navy
bg-brand-orange / text-brand-orange
bg-brand-yellow / text-brand-yellow
focus:ring-brand-yellow
accent-brand-orange
```

### Vizualni stil
- Border radius: `rounded-xl` (inputi, modali) ili `rounded-2xl` (kartice)
- Modali imaju animaciju: `animate-in fade-in zoom-in-95 duration-200`
- Tablice: `divide-y divide-gray-100 dark:divide-gray-800`
- Border kartice: `border border-gray-100 dark:border-gray-800`

---

## Struktura projekta

```
src/
├── app/
│   ├── layout.tsx              # Root layout — Sidebar + ThemeProvider
│   ├── globals.css             # Tailwind v4 + brand boje
│   ├── page.tsx                # Dashboard (/)
│   ├── klijenti/
│   │   ├── page.tsx            # Lista klijenata (SSR)
│   │   └── [id]/page.tsx       # Detalji klijenta (SSR)
│   ├── potrebe/
│   │   ├── page.tsx            # Pregled otvorenih potreba (SSR)
│   │   ├── [naziv]/page.tsx    # Detalji potrebe po nazivu (SSR)
│   │   └── zatvorene/page.tsx  # Zatvorene potrebe (SSR)
│   ├── pozicije/
│   │   └── [id]/page.tsx       # Detalji pozicije (SSR)
│   ├── prihodi/
│   │   └── page.tsx            # Revenue dashboard (client)
│   ├── postavke/
│   │   └── page.tsx            # Postavke (client)
│   └── api/                    # API Routes (server-side only)
│       ├── sudreg/             # Lookup Croatian company registry
│       ├── ugovori/            # Contract CRUD + send
│       ├── kandidati/          # Candidate operations
│       ├── potrebe/            # Needs file management
│       ├── postavke/           # Settings + SMTP/Drive test
│       └── cache/              # Next.js cache revalidation
├── components/
│   ├── Sidebar.tsx             # Navigacija, theme toggle, collapse
│   ├── ThemeProvider.tsx       # next-themes wrapper
│   ├── DodajKlijentaModal.tsx  # Modal: novi klijent + SUDREG lookup
│   ├── DodajPozicijuModal.tsx  # Modal: nova pozicija/potreba
│   ├── DodajKandidataModal.tsx # Modal: novi kandidat
│   ├── UrediPozicijuModal.tsx  # Modal: uredi poziciju
│   ├── klijenti/
│   │   ├── KlijentiClientView.tsx        # Lista klijenata (client)
│   │   ├── KlijentDetaljiClientView.tsx  # Detalji klijenta (client)
│   │   └── PosaljiUgovorModal.tsx        # Modal: slanje ugovora
│   └── potrebe/
│       ├── PotrebePregledTablica.tsx     # Tablica otvorenih potreba
│       ├── PotrebePoNacionalnostima.tsx  # Potrebe po nacionalnostima
│       └── types.ts
├── lib/
│   ├── supabase.ts             # Supabase client (browser)
│   ├── server/
│   │   ├── supabase.ts         # Supabase client (server)
│   │   ├── klijenti.ts         # Server data queries za klijente
│   │   ├── mail.ts             # Email slanje
│   │   ├── template.ts         # Email template
│   │   ├── integracije.ts      # Čitanje SMTP/Drive postavki
│   │   ├── secrets.ts          # Secret management
│   │   ├── drive.ts            # Google Drive upload
│   │   └── driveFoldering.ts   # Drive folder struktura
│   ├── client/
│   │   └── revalidateCache.ts  # Client-side cache revalidation helper
│   ├── types/
│   │   ├── klijenti.ts         # TypeScript interfacei za klijente
│   │   └── dokumenti.ts        # TypeScript interfacei za dokumente
│   └── pdf/
│       └── generirajUgovorPdf.ts  # PDF generiranje ugovora
```

---

## Baza podataka (Supabase tablice)

| Tablica | Opis |
|---|---|
| `klijenti` | Tvrtke — klijenti agencije |
| `pozicije` | Radne pozicije/potrebe vezane za klijenta |
| `kandidati` | Kandidati vezani za poziciju |
| `nacionalnosti_radnika` | Lookup tablica nacionalnosti |
| `pozicije_nacionalnosti` | Many-to-many: pozicija ↔ nacionalnost |
| `ugovori` | Ugovori generirani i poslani klijentima |

### Ključna polja

**`pozicije`**
- `id`, `klijent_id`, `naziv_pozicije`, `broj_izvrsitelja`
- `datum_upisa` (ISO date string)
- `tip_radnika`: `'domaci' | 'strani' | 'strani_u_rh'`
- `cijena_po_kandidatu` (EUR, number)
- `avans_dogovoren` (boolean), `avans_postotak` (number|null)
- `status`: `'Otvoreno' | 'Zatvoreno'`

**`kandidati`**
- `id`, `pozicija_id`, `ime_prezime`, `nacionalnost`
- `email`, `telefon`, `datum_slanja` (ISO date string)
- `status`: `'Poslano klijentu' | 'Zaposlen'`

---

## Konvencije i pravila

### Opće
- Sav UI tekst je na **hrvatskom jeziku**
- Datumi se formatiraju kao `DD.MM.YYYY.` (s točkom na kraju)
- Valuta: EUR, format `hr-HR` locale (`1.250 €`)
- Ne koristiti emojije u UI bez eksplicitnog zahtjeva

### Supabase
- Server-side query → `src/lib/server/supabase.ts`
- Client-side query → `src/lib/supabase.ts`
- Nakon mutacija (insert/update/delete) pozvati `revalidateCachePaths()` iz `src/lib/client/revalidateCache.ts`

### Next.js
- SSR stranice (page.tsx s `async`) imaju `export const revalidate = 900`
- Client komponente označene s `'use client'` na vrhu
- API routes su u `src/app/api/` i koriste `NextResponse`

### Komponente
- Modali su uvijek `fixed inset-0` overlay s `backdrop-blur-sm`
- Modali imaju `animate-in fade-in zoom-in-95 duration-200` animaciju
- Inputi: `px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white`
- Primarne akcije (Spremi): `bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow`
- Sekundarne akcije (Odustani): `text-gray-600 dark:text-gray-400 hover:text-brand-navy dark:hover:text-white`

### Popover komponente (DatePicker i sl.)
- Popoveri koji se otvaraju unutar modala **moraju** koristiti `createPortal(popover, document.body)` jer modali imaju `overflow-y-auto` koji clippa apsolutno pozicionirane elemente
- Pozicionirati s `position: fixed` i koordinatama iz `getBoundingClientRect()` triggera
- Uvijek slušati `scroll` event za ažuriranje pozicije kad se modal scrolla
- `align="left"` → `left = rect.left`, `align="right"` → `right = window.innerWidth - rect.right`

### Provjera UI promjena
- Nakon svake vizualne promjene (nova komponenta, promjena layouta, nova stilizacija) napravi provjeru da element nije odrezan/clippan/prevelik
- Posebno paziti na:
  - Popovere unutar modala (overflow clipping)
  - Elemente u desnoj koloni grida (mogu overflow desno)
  - Mobilni prikaz (responsivnost)

### Zabrane
- Ne koristiti `any` bez jasnog razloga
- Ne skipati TypeScript greške (no `@ts-ignore` bez komentara)
- Ne koristiti `git push --force` bez eksplicitnog odobrenja
- Ne commitati `.env.local`

---

## TODO lista — prioritizirana

### 1. DatePickerInput komponenta ⭐⭐⭐ ✅ GOTOVO

**Što:** Zamijeniti sve native `<input type="date">` s custom datepicker komponentom.

**Zašto:** Native date input izgleda drugačije na svakom browseru i ne prati brand.

**Kako:**
1. Instalirati: `npm install react-day-picker date-fns`
2. Napraviti `src/components/ui/DatePickerInput.tsx` — styled s Tailwindom, koristiti `react-day-picker` v9 (DayPicker)
3. Komponenta prima: `value: string` (ISO format `YYYY-MM-DD`), `onChange: (val: string) => void`, `label?: string`
4. Vizualno: input s ikonom kalendara, klik otvara popover s kalendarom
5. Koristiti brand boje: `bg-brand-orange` za selected dan, `text-brand-navy` za header
6. Zamijeniti na lokacijama:
   - `DodajPozicijuModal.tsx` — `datum_upisa`
   - `DodajKandidataModal.tsx` — `datum_slanja`
   - `UrediPozicijuModal.tsx` — `datum_upisa`

---

### 2. Toast notifikacije (Sonner) ⭐⭐⭐ ✅ GOTOVO

**Što:** Dodati toast notifikacije za uspješne i neuspješne akcije.

**Zašto:** Trenutno modali se samo zatvore bez feedbacka. Korisnik ne zna je li akcija uspjela.

**Kako:**
1. Instalirati: `npm install sonner`
2. Dodati `<Toaster />` u `src/app/layout.tsx` (samo jednom, u root layoutu)
3. Konfiguracija: `position="bottom-right"`, `richColors`
4. Koristiti `toast.success('Tekst')` i `toast.error('Tekst')` u modalima umjesto samo `setGreska()`
5. Primjeri poruka:
   - Spremi poziciju: `"Potreba uspješno dodana"`
   - Spremi kandidata: `"Kandidat uspješno dodan"`
   - Spremi klijenta: `"Klijent uspješno dodan"`
   - Greška: koristiti `toast.error()` uz zadržavanje `setGreska()` za inline grešku u formi

---

### 3. Dashboard (/page.tsx) ⭐⭐⭐

**Što:** Zamijeniti placeholder s pravim statistikama.

**Zašto:** Prva stvar koju korisnik vidi je prazna stranica.

**Kako:**
1. `src/app/page.tsx` prebaciti na `async` server komponentu
2. Dohvatiti iz Supabase (server-side):
   - Ukupan broj klijenata
   - Broj otvorenih pozicija (`status = 'Otvoreno'`)
   - Broj kandidata ovaj mjesec (`status = 'Zaposlen'`, `datum_slanja` >= početak mjeseca)
   - Ukupan potencijalni prihod (otvorene pozicije × cijena × preostalo)
3. Prikazati 4 stat kartice u gridu (kopirati stil kartica s `/prihodi`)
4. Ispod kartica — lista zadnjih 5 akcija ili posljednjih dodanih klijenata

---

### 4. Progress bar na pozicijama ⭐⭐ ✅ GOTOVO

**Implementirano:** `src/components/ui/ProgressBar.tsx`
- Props: `current: number`, `total: number`, `className?: string`
- Boja: < 50% = brand-orange, 50–99% = brand-yellow, 100% = green-500
- `PozicijaDetalji` type dobio `broj_kandidata: number` (Supabase: `kandidati(count)`)
- Prikazano u `KlijentDetaljiClientView.tsx`: u kartičnom i tabličnom prikazu

---

### 5. Poboljšati stat kartice na Prihodima ⭐

**Što:** Dodati vizualni identitet karticama na `/prihodi`.

**Kako:**
1. Kartica "Naplaćeno" — lijevi border `border-l-4 border-gray-400`
2. Kartica "Čeka se naplata" — lijevi border `border-l-4 border-brand-orange`
3. Kartica "Potencijalno" — lijevi border `border-l-4 border-green-500`
4. Ikona u pozadini (desni kut, velika, low-opacity) za vizualni karakter

---

### 6. Custom select komponenta ⭐ ✅ GOTOVO

**Implementirano:** `src/components/ui/Select.tsx`
- Portal-based dropdown (createPortal) — ne može biti clippan overflow-om modala
- Isti vizualni stil kao DatePickerInput (brand boje, rounded-xl, focus ring)
- Props: `value`, `onChange`, `options: {value, label}[]`, `label?`, `placeholder?`
- Zamijenjeno u: DodajPozicijuModal (tip radnika), UrediPozicijuModal (tip radnika), DodajKlijentaModal (industrija), prihodi/page.tsx (godina)

---

### 7. Empty states ⭐ ✅ GOTOVO

**Implementirano:** `src/components/ui/EmptyState.tsx`
- Props: `icon?: LucideIcon`, `title: string`, `description?: string`, `action?: { label, onClick }`, `compact?: boolean`
- Zamijenjeno u: KlijentiClientView, KlijentDetaljiClientView (3×), potrebe/page, potrebe/zatvorene/page, potrebe/[naziv]/page, pozicije/[id]/page

---

## UI komponente koje treba napraviti (`src/components/ui/`)

- `DatePickerInput.tsx` — custom date picker (react-day-picker)
- `ProgressBar.tsx` — progress bar za pozicije
- `EmptyState.tsx` — empty state s ikonom i CTA
- `Select.tsx` — custom styled select (opcionalno)

---

## Instalacije koje treba napraviti

```bash
npm install react-day-picker date-fns   # za datepicker
npm install sonner                       # za toast notifikacije
```

---

## Lokalizacija

- UI jezik: **Hrvatski**
- Datumi: `DD.MM.YYYY.` (npr. `28.02.2026.`)
- Valuta: EUR, `hr-HR` locale
- `<html lang="hr">` u layoutu

---

## Deployment

- Aplikacija se deploya na Vercel (pretpostavljeno)
- `.env.local` sadrži Supabase URL/key i SMTP/Drive kredencijale — ne commitati
- Environment varijable u produkciji postavljaju se u Vercel dashboardu
