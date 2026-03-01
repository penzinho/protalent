# UI/UX Review — HR Agencija

> Generiran: 2026-02-28

## Generalni dojam

Aplikacija ima solidan temelj — čisti kod, dobra struktura, konzistentni dark mode, brand boje lijepo integrirane. Dobra TypeScript pokrivenost, jasna separacija server/client komponenti. Ovo nije "from scratch" projekt, već ozbiljna baza za razvoj.

---

## Problemi i prijedlozi poboljšanja

### P1 — Dashboard (`/`) je potpuno prazan

**Problem:** Prikazuje samo placeholder tekst. Prva stvar koju korisnik vidi.
**Rješenje:** Prikazati stvarne stats — broj klijenata, otvorene pozicije, kandidati ovaj mjesec, potencijalni prihod.

---

### P2 — Native `<input type="date">` — nedosljedan prikaz

**Problem:** Svi datumski inputi (`datum_upisa`, `datum_slanja`) koriste browser-native date picker koji izgleda drugačije na Chromeu, Firefoxu i Safariju. Ne prati brand dizajn.

**Zahvaćene lokacije:**
- `src/components/DodajPozicijuModal.tsx` — `datum_upisa`
- `src/components/DodajKandidataModal.tsx` — `datum_slanja`
- `src/components/UrediPozicijuModal.tsx` — `datum_upisa`

**Rješenje:** Instalirati `react-day-picker` + `date-fns`, napraviti reusable `DatePickerInput` komponentu i zamijeniti sve native date inpute.

---

### P3 — Native `<select>` elementi — generički izgled

**Problem:** Select za godinu na Prihodima, tip radnika u modalima — browser-default select ne prati custom stil.

**Zahvaćene lokacije:**
- `src/app/prihodi/page.tsx` — odabir godine
- `src/components/DodajPozicijuModal.tsx` — tip radnika
- `src/components/UrediPozicijuModal.tsx` — tip radnika
- `src/components/DodajKlijentaModal.tsx` — industrija

**Rješenje:** Custom dropdown komponenta s Tailwindom ili `@headlessui/react` Listbox.

---

### P4 — Nema progress bara na pozicijama

**Problem:** Pozicije imaju `broj_izvrsitelja` i broj kandidata, ali nema vizualnog prikaza koliko je popunjeno.

**Rješenje:** Mini progress bar (npr. "3/10 popunjeno") na kartici/retku svake pozicije u `KlijentDetaljiClientView`.

---

### P5 — Nema toast notifikacija za uspješne akcije

**Problem:** Nakon uspješnog spremanja (kandidat, pozicija, klijent) modal se samo zatvori bez ikavog feedbacka.

**Rješenje:** Dodati `sonner` biblioteku (lagana, radi odlično s Next.js App Routerom) za toast poruke.

---

### P6 — Stat kartice na Prihodima — vizualno ravne

**Problem:** Kartice su funkcionalne ali bez vizualnog identiteta koji ih razlikuje na prvi pogled.

**Rješenje:** Dodati obojani lijevi border ili obojenu ikonu pozadine — zelena za Potencijalno, narančasta za Čeka naplatu, siva za Naplaćeno.

---

### P7 — Prazna stanja (empty states) — samo tekst

**Problem:** Kad nema podataka, ispisuje se samo plain tekst bez vizualnog konteksta.

**Rješenje:** Empty state s ikonom + opisnim tekstom + opcionalnim CTA gumbom (npr. "Dodaj prvog klijenta").

---

## Redoslijed implementacije (preporučen)

1. **DatePickerInput** — najuočljivija vizualna promjena, koristi se na više mjesta
2. **Sonner toasti** — mali effort, veliki UX gain
3. **Dashboard stats** — prva stvar koju korisnik vidi
4. **Progress bar na pozicijama** — koristan podatak odmah vidljiv
5. **Custom select** — estetska unapređenja
6. **Obojane stat kartice** — polish
7. **Empty states** — polish

---

## Što radi dobro (ne diraj)

- Dark mode implementacija je dosljedna i kvalitetna
- Modal animacije (`animate-in fade-in zoom-in-95`) su lijepe
- Sidebar s collaps stanjem u localStorage
- TypeScript tipizacija je solida
- Supabase integracija je dobro odvojena (server vs. client)
- Brand boje su konzistentno primijenjene
- Error handling u formama postoji
- Revalidate cache pattern je ispravan
